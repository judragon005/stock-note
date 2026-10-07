/**
 * 外部 API 金鑰池與狀態型別定義 (Spec 0167 / Ticket 01)
 * ApiKeyPool Types and State Schema
 */

export type ProviderType = 'finmind' | 'finnhub' | 'fred' | 'polygon' | 'coingecko' | 'sec' | 'fmp' | 'alphavantage';

export type KeyHealthStatus = 'HEALTHY' | 'COOLING_DOWN' | 'QUOTA_EXHAUSTED' | 'INVALID';

export interface ApiKeyItem {
  id: string;               // 唯一標識 ID (UUID 或隨機 hash)
  provider: ProviderType;   // API 服務提供商
  key: string;              // 實際 API Token
  alias?: string;           // 識別別名 (例如 "個人主帳號", "備用池1")
  weight: number;           // 派發權重 (預設 1)
  dailyQuotaLimit: number;  // 單日上限 (-1 代表無上限)
  totalRequestsToday: number; // 今日累計請求數
  rateLimitPerMin: number;  // 每分鐘呼叫上限
  consecutiveFailures: number; // 連續失敗次數
  isBlacklisted: boolean;   // 是否因 401/403 永久失效
  cooldownUntil: number;    // 冷卻截止時間戳 (Date.now() + ms)
  lastUsedTimestamp: number;// 上次調用時間戳
}

export interface KeyPoolExecutionOptions {
  provider: ProviderType;
  endpointUrl: (key: string) => string;
  fetcher: (url: string) => Promise<Response>;
  maxRetriesPerKey?: number;
}

export interface KeyPoolStatistics {
  provider: ProviderType;
  totalKeys: number;
  healthyKeys: number;
  coolingKeys: number;
  exhaustedKeys: number;
  invalidKeys: number;
  totalRequestsToday: number;
}

/**
 * 建立具備安全預設值的 ApiKeyItem
 */
export function createDefaultApiKeyItem(
  provider: ProviderType,
  key: string,
  options?: Partial<Omit<ApiKeyItem, 'id' | 'provider' | 'key'>>
): ApiKeyItem {
  return {
    id: `${provider}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
    provider,
    key,
    alias: options?.alias,
    weight: options?.weight ?? 1,
    dailyQuotaLimit: options?.dailyQuotaLimit ?? 300,
    totalRequestsToday: options?.totalRequestsToday ?? 0,
    rateLimitPerMin: options?.rateLimitPerMin ?? 30,
    consecutiveFailures: options?.consecutiveFailures ?? 0,
    isBlacklisted: options?.isBlacklisted ?? false,
    cooldownUntil: options?.cooldownUntil ?? 0,
    lastUsedTimestamp: options?.lastUsedTimestamp ?? 0,
  };
}

/**
 * 計算金鑰當前的健康度狀態
 */
export function computeKeyHealthStatus(item: ApiKeyItem, now: number = Date.now()): KeyHealthStatus {
  if (item.isBlacklisted) {
    return 'INVALID';
  }
  if (item.cooldownUntil > now) {
    return 'COOLING_DOWN';
  }
  if (item.dailyQuotaLimit !== -1 && item.totalRequestsToday >= item.dailyQuotaLimit) {
    return 'QUOTA_EXHAUSTED';
  }
  return 'HEALTHY';
}

/**
 * 判斷金鑰是否立即可調用
 */
export function isKeyUsable(item: ApiKeyItem, now: number = Date.now()): boolean {
  return computeKeyHealthStatus(item, now) === 'HEALTHY';
}
