import { TargetAllocationConfig } from '../types/allocation';

const STORAGE_KEY = 'stock_tracker_target_allocations';
const ACTIVE_CONFIG_ID_KEY = 'stock_tracker_active_target_allocation_id';

export const DEFAULT_MARKET_ALLOCATION: TargetAllocationConfig = {
  id: 'default-market-allocation',
  type: 'MARKET',
  name: '核心資產標準配置 (台美股 4:4:2)',
  items: [
    { key: 'TW', name: '台股部位 (TW)', targetPercent: 40 },
    { key: 'US', name: '美股部位 (US)', targetPercent: 40 },
    { key: 'CASH', name: '現金與儲備 (CASH)', targetPercent: 20 },
  ],
  toleranceBandPercent: 5.0,
  updatedAt: Date.now(),
};

export const DEFAULT_SYMBOL_ALLOCATION: TargetAllocationConfig = {
  id: 'default-symbol-allocation',
  type: 'SYMBOL',
  name: '核心權值 ETF 配置',
  items: [
    { key: '0050', name: '元大台灣50 (0050)', targetPercent: 40 },
    { key: '2330', name: '台積電 (2330)', targetPercent: 30 },
    { key: 'QQQ', name: 'Invesco QQQ Trust (QQQ)', targetPercent: 30 },
  ],
  toleranceBandPercent: 5.0,
  updatedAt: Date.now(),
};

/**
 * 驗證目標比例配置之百分比總和是否為 100% (容許浮點誤差 0.01%)
 */
export function validateAllocationSum(items: { targetPercent: number }[]): {
  isValid: boolean;
  totalPercent: number;
  difference: number;
} {
  const totalPercent = items.reduce((sum, item) => sum + (Number(item.targetPercent) || 0), 0);
  const diff = Number((totalPercent - 100).toFixed(2));
  return {
    isValid: Math.abs(diff) < 0.01,
    totalPercent: Number(totalPercent.toFixed(2)),
    difference: diff,
  };
}

/**
 * 讀取所有儲存之目標配置清單
 */
export function loadTargetAllocations(): TargetAllocationConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_MARKET_ALLOCATION, DEFAULT_SYMBOL_ALLOCATION];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_MARKET_ALLOCATION, DEFAULT_SYMBOL_ALLOCATION];
  } catch (err) {
    console.error('Failed to load target allocations from localStorage:', err);
    return [DEFAULT_MARKET_ALLOCATION, DEFAULT_SYMBOL_ALLOCATION];
  }
}

/**
 * 儲存目標配置清單
 */
export function saveTargetAllocations(configs: TargetAllocationConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save target allocations to localStorage:', err);
  }
}

/**
 * 讀取當前啟用的目標配置 ID
 */
export function loadActiveTargetAllocationId(): string {
  try {
    return localStorage.getItem(ACTIVE_CONFIG_ID_KEY) || DEFAULT_MARKET_ALLOCATION.id;
  } catch {
    return DEFAULT_MARKET_ALLOCATION.id;
  }
}

/**
 * 儲存當前啟用的目標配置 ID
 */
export function saveActiveTargetAllocationId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CONFIG_ID_KEY, id);
  } catch (err) {
    console.error('Failed to save active allocation id to localStorage:', err);
  }
}
