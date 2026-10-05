/**
 * 智慧金鑰輪替與狀態調度管理器 (Spec 0167 / Tickets 02 & 03)
 * SmartKeyRotator Core Engine
 */

import {
  ApiKeyItem,
  ProviderType,
  KeyPoolExecutionOptions,
  KeyPoolStatistics,
  createDefaultApiKeyItem,
  isKeyUsable,
} from './apiKeyPoolTypes';
import { logger } from '../utils/logger';

export class SmartKeyRotator {
  private keyStore: Map<ProviderType, ApiKeyItem[]> = new Map();
  private cursorIndex: Map<ProviderType, number> = new Map();
  private lastResetDateStr: string = new Date().toISOString().slice(0, 10);

  constructor(initialKeys?: { provider: ProviderType; key: string; options?: Partial<ApiKeyItem> }[]) {
    if (initialKeys) {
      for (const item of initialKeys) {
        this.registerKey(item.provider, item.key, item.options);
      }
    }
  }

  /**
   * 檢查並自動執行跨日計數器歸零重置
   */
  private checkAndResetDailyQuota(now: number = Date.now()): void {
    const todayStr = new Date(now).toISOString().slice(0, 10);
    if (todayStr !== this.lastResetDateStr) {
      for (const list of this.keyStore.values()) {
        for (const k of list) {
          k.totalRequestsToday = 0;
          k.consecutiveFailures = 0;
        }
      }
      this.lastResetDateStr = todayStr;
      logger.info(`[SmartKeyRotator] 跨日計數器已重置至 ${todayStr}`);
    }
  }

  /**
   * 註冊金鑰至金鑰池
   */
  public registerKey(
    provider: ProviderType,
    key: string,
    options?: Partial<Omit<ApiKeyItem, 'id' | 'provider' | 'key'>>
  ): ApiKeyItem {
    if (!this.keyStore.has(provider)) {
      this.keyStore.set(provider, []);
      this.cursorIndex.set(provider, 0);
    }

    const list = this.keyStore.get(provider)!;
    const existing = list.find((k) => k.key === key);
    if (existing) {
      // 更新屬性
      if (options?.dailyQuotaLimit !== undefined) existing.dailyQuotaLimit = options.dailyQuotaLimit;
      if (options?.alias !== undefined) existing.alias = options.alias;
      if (options?.weight !== undefined) existing.weight = options.weight;
      return existing;
    }

    const newItem = createDefaultApiKeyItem(provider, key, options);
    list.push(newItem);
    return newItem;
  }

  /**
   * 移除特定金鑰
   */
  public removeKey(provider: ProviderType, keyOrId: string): boolean {
    const list = this.keyStore.get(provider);
    if (!list) return false;
    const initialLen = list.length;
    this.keyStore.set(
      provider,
      list.filter((k) => k.id !== keyOrId && k.key !== keyOrId)
    );
    return this.keyStore.get(provider)!.length < initialLen;
  }

  /**
   * 取得指定供應商所有金鑰清單
   */
  public getKeys(provider: ProviderType): ApiKeyItem[] {
    return this.keyStore.get(provider) || [];
  }

  /**
   * 輪替獲取下一個可用的健康金鑰 (加權 Round-Robin)
   */
  public acquireKey(provider: ProviderType, now: number = Date.now()): ApiKeyItem | null {
    this.checkAndResetDailyQuota(now);
    const keys = this.keyStore.get(provider);
    if (!keys || keys.length === 0) return null;

    // 篩選當前立即可用（健康）的金鑰
    const availableKeys = keys.filter((k) => isKeyUsable(k, now));
    if (availableKeys.length === 0) {
      return null;
    }

    let cursor = this.cursorIndex.get(provider) || 0;
    cursor = cursor % availableKeys.length;
    const selected = availableKeys[cursor];
    this.cursorIndex.set(provider, cursor + 1);

    selected.lastUsedTimestamp = now;
    selected.totalRequestsToday += 1;
    return selected;
  }

  /**
   * 回報呼叫狀態與處理指數退避或黑名單
   */
  public reportStatus(
    keyItem: ApiKeyItem,
    httpStatus: number,
    retryAfterSec?: number,
    now: number = Date.now()
  ): void {
    if (httpStatus === 429) {
      // 遭遇限流：指數退避 (60s * 2^failures，最大 1 小時)
      const baseSec = retryAfterSec && retryAfterSec > 0 ? retryAfterSec : 60;
      const penaltyMs = baseSec * 1000 * Math.pow(2, keyItem.consecutiveFailures);
      keyItem.cooldownUntil = now + Math.min(penaltyMs, 3600000);
      keyItem.consecutiveFailures += 1;
      logger.warn(
        `[SmartKeyRotator] Key ${keyItem.id} 遭遇 429 限流，進入冷卻至 ${new Date(
          keyItem.cooldownUntil
        ).toLocaleTimeString()} (連續失敗: ${keyItem.consecutiveFailures})`
      );
    } else if (httpStatus === 401 || httpStatus === 403) {
      // 身份無效或未授權：永久拉黑
      keyItem.isBlacklisted = true;
      logger.error(`[SmartKeyRotator] Key ${keyItem.id} 授權失敗 (${httpStatus})，已拉黑`);
    } else if (httpStatus >= 200 && httpStatus < 300) {
      // 成功：重置連續失敗
      keyItem.consecutiveFailures = 0;
    }
  }

  /**
   * 階梯重試調度器：自動輪替金鑰重試
   */
  public async executeWithRotation<T>(
    options: KeyPoolExecutionOptions,
    parser: (text: string) => T,
    now: number = Date.now()
  ): Promise<T> {
    const list = this.keyStore.get(options.provider) || [];
    const maxAttempts = Math.max(1, list.length * (options.maxRetriesPerKey || 2));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeKey = this.acquireKey(options.provider, now);
      if (!activeKey) {
        throw new Error(`[SmartKeyRotator] 無可用且健康的 ${options.provider} API Key`);
      }

      const url = options.endpointUrl(activeKey.key);
      try {
        const response = await options.fetcher(url);
        this.reportStatus(activeKey, response.status, undefined, now);

        if (response.status === 429) {
          // 429 繼續嘗試下一個 Key
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        return parser(text);
      } catch (err: any) {
        logger.warn(`[SmartKeyRotator] 調用失敗 (Key: ${activeKey.id}): ${err.message}`);
        // 繼續由下一組 Key 嘗試
      }
    }

    throw new Error(`[SmartKeyRotator] 所有 ${options.provider} API Keys 均調用失敗`);
  }

  /**
   * 取得金鑰池統計
   */
  public getStatistics(provider: ProviderType, now: number = Date.now()): KeyPoolStatistics {
    const keys = this.keyStore.get(provider) || [];
    let healthy = 0;
    let cooling = 0;
    let exhausted = 0;
    let invalid = 0;
    let totalReq = 0;

    for (const k of keys) {
      totalReq += k.totalRequestsToday;
      if (k.isBlacklisted) invalid++;
      else if (k.cooldownUntil > now) cooling++;
      else if (k.dailyQuotaLimit !== -1 && k.totalRequestsToday >= k.dailyQuotaLimit) exhausted++;
      else healthy++;
    }

    return {
      provider,
      totalKeys: keys.length,
      healthyKeys: healthy,
      coolingKeys: cooling,
      exhaustedKeys: exhausted,
      invalidKeys: invalid,
      totalRequestsToday: totalReq,
    };
  }
}

// 匯出全域單例 (可視需要注入)
export let globalKeyRotator = new SmartKeyRotator();

/**
 * 僅供單元測試隔離用途重置全域金鑰輪替器單例
 */
export function resetGlobalKeyRotatorForTest(): void {
  globalKeyRotator = new SmartKeyRotator();
}
