import { UpcomingCatalyst } from '../types/macro';
import { ReceivableDividend } from '../types/dividend';
import { generateRollingSeedCatalysts } from '../data/defaultCatalysts';
import { calculateUpcomingCatalysts } from '../engine/macroAdvisorEngine';

export const STORAGE_KEY_CATALYSTS = 'STOCK_TRACKER_UPCOMING_CATALYSTS_V1';
export const STORAGE_KEY_REMOTE_CATALYSTS_CACHE = 'STOCK_TRACKER_REMOTE_CATALYSTS_CACHE_V1';

export type CustomCatalystInput = Omit<UpcomingCatalyst, 'daysLeft' | 'id'> & { id?: string };

/**
 * 載入本地儲存之使用者自訂事件
 */
export function loadStoredCustomCatalysts(): UpcomingCatalyst[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALYSTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Failed to load custom catalysts:', e);
    return [];
  }
}

/**
 * 新增或更新單筆自訂催化劑事件 (持久化至 localStorage)
 */
export function saveCustomCatalyst(
  input: CustomCatalystInput
): UpcomingCatalyst {
  const current = loadStoredCustomCatalysts();
  const id = input.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item: UpcomingCatalyst = {
    ...input,
    id,
    daysLeft: 0,
    isCustom: true,
    impact: input.impact || 'MEDIUM',
    targetMarket: input.targetMarket || 'ALL',
  };

  const existingIdx = current.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    current[existingIdx] = item;
  } else {
    current.push(item);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CATALYSTS, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save custom catalyst:', e);
    }
  }

  return item;
}

/**
 * 刪除單筆自訂催化劑事件
 */
export function deleteCustomCatalyst(id: string): void {
  const current = loadStoredCustomCatalysts();
  const filtered = current.filter((c) => c.id !== id);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CATALYSTS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete custom catalyst:', e);
    }
  }
}

/**
 * 一鍵恢復預設日曆 (清除本地快取與自訂項目)
 */
export function resetCatalystsToDefault(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_CATALYSTS);
      localStorage.removeItem(STORAGE_KEY_REMOTE_CATALYSTS_CACHE);
    } catch (e) {
      console.error('Failed to reset catalysts:', e);
    }
  }
}

/**
 * 在庫持股除息日自動匯流函式
 * 篩選未來 30 天內即將除息之標的，映射為 EARNINGS_DIVIDEND 類別事件
 */
export function mergeHoldingsDividends(
  baseCatalysts: Omit<UpcomingCatalyst, 'daysLeft'>[],
  receivableDividends: ReceivableDividend[] = [],
  asOfDateStr: string = new Date().toISOString().split('T')[0]
): Omit<UpcomingCatalyst, 'daysLeft'>[] {
  if (!receivableDividends || receivableDividends.length === 0) {
    return baseCatalysts;
  }

  const baseTime = new Date(`${asOfDateStr}T00:00:00`).getTime();
  const maxForwardTime = baseTime + 30 * 24 * 60 * 60 * 1000;

  const validDivCatalysts: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];
  const seenSymbols = new Set<string>();

  for (const div of receivableDividends) {
    if (!div.exDate) continue;
    const exTime = new Date(`${div.exDate}T00:00:00`).getTime();

    // 僅納入未來 30 天以內 (且在基準日當日或之後) 的除息
    if (exTime >= baseTime && exTime <= maxForwardTime) {
      const key = `${div.symbol}-${div.exDate}`;
      if (!seenSymbols.has(key)) {
        seenSymbols.add(key);
        const cashAmount = div.cashDividendPerShare ?? 0;
        const formattedAmount = cashAmount > 0 ? `${cashAmount} 元` : '待公告';
        validDivCatalysts.push({
          id: `div-${div.symbol}-${div.exDate}`,
          name: `${div.name || div.symbol} (${div.symbol}) 除息`,
          date: div.exDate,
          category: 'EARNINGS_DIVIDEND',
          impact: 'MEDIUM',
          targetMarket: div.market || 'TW',
          symbol: div.symbol,
          description: `持股除息預告：預估配息每股 ${formattedAmount}，預計入帳發放日為 ${div.payDate || '待公布'}。`,
        });
      }
    }
  }

  return [...baseCatalysts, ...validDivCatalysts];
}

export interface GetAggregatedCatalystsOptions {
  asOfDate?: string;
  receivableDividends?: ReceivableDividend[];
  remoteCatalysts?: Omit<UpcomingCatalyst, 'daysLeft'>[];
}

/**
 * 宏觀戰情室多源催化劑聚合中樞 (Aggregation Pipeline)
 * 聚合順序：
 * 1. 自適應前瞻種子庫 (常態週期 + 2026~2027 官方排程)
 * 2. 外部免費同步快取 (TWSE / Finnhub)
 * 3. 在庫持股即將除息日 (Receivable Dividends)
 * 4. 使用者本地自訂事件 (Custom Events, 最高優先)
 * 最後經過 calculateUpcomingCatalysts 計算倒數天數、過濾過期與升冪排序
 */
export function getAggregatedCatalysts(
  options: GetAggregatedCatalystsOptions = {}
): UpcomingCatalyst[] {
  const asOfDate = options.asOfDate || new Date().toISOString().split('T')[0];

  // 1. 基礎自適應前瞻種子
  const seedList = generateRollingSeedCatalysts(asOfDate);

  // 2. 外部遠端快取
  let remoteList: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];
  if (options.remoteCatalysts && options.remoteCatalysts.length > 0) {
    remoteList = options.remoteCatalysts;
  } else {
    try {
      const rawRemote = localStorage.getItem(STORAGE_KEY_REMOTE_CATALYSTS_CACHE);
      if (rawRemote) {
        const parsed = JSON.parse(rawRemote);
        if (Array.isArray(parsed)) remoteList = parsed;
      }
    } catch {
      // ignore
    }
  }

  // 3. 在庫持股除息匯流
  const combinedWithDividends = mergeHoldingsDividends(
    [...seedList, ...remoteList],
    options.receivableDividends,
    asOfDate
  );

  // 4. 使用者自訂事件
  const customList = loadStoredCustomCatalysts();

  // 聚合去重 (以 id 為主鍵，自訂事件具有最高優先度)
  const map = new Map<string, Omit<UpcomingCatalyst, 'daysLeft'>>();

  // 先放種子、遠端與除息
  for (const item of combinedWithDividends) {
    map.set(item.id, item);
  }

  // 再放自訂事件 (覆寫或新增)
  for (const item of customList) {
    map.set(item.id, item);
  }

  const rawArray = Array.from(map.values());

  // 5. 統一進行天數試算與排序
  return calculateUpcomingCatalysts(rawArray, asOfDate);
}
