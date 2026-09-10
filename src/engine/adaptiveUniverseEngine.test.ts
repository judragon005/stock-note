import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEffectiveUniverse,
  probeSymbolLiveness,
  healInactiveSymbolInPool,
  checkAndSyncUniverseDaily,
  TW_RESERVE_CANDIDATES,
  US_RESERVE_CANDIDATES,
} from './adaptiveUniverseEngine';
import {
  clearDynamicUniverseStorage,
  getDynamicUniverseStorage,
  saveDynamicUniverseStorage,
} from '../utils/storage';
import {
  TW50_BLUE_CHIP_SYMBOLS,
  US_MEGA_50_CORE_SYMBOLS,
  TW_TOP_30_FOCUS_SYMBOLS,
  US_TOP_30_FOCUS_SYMBOLS,
  getScopedUniverseSymbols,
} from './muscleBookerEngine';

// 模擬 LocalStorage 環境
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

describe('Adaptive Universe & Liveness Probe Engine (自適應動態成分股與存活探針)', () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', storageMock);
    clearDynamicUniverseStorage();
    vi.restoreAllMocks();
  });

  describe('1. 快取讀取與種子回退 (Stale-While-Revalidate Baseline)', () => {
    it('本地無快取時，應 100% 回退至靜態種子常數清單', () => {
      const tw50 = getEffectiveUniverse('TW', 'TW50_CORE');
      expect(tw50).toHaveLength(50);
      expect(tw50[0].symbol).toBe('2330');
      expect(tw50).toEqual(TW50_BLUE_CHIP_SYMBOLS);

      const us50 = getEffectiveUniverse('US', 'TW50_CORE');
      expect(us50).toHaveLength(50);
      expect(us50.some((s) => s.symbol === 'NVDA')).toBe(true);
      expect(us50).toEqual(US_MEGA_50_CORE_SYMBOLS);

      expect(TW_RESERVE_CANDIDATES.length).toBeGreaterThan(10);
      expect(US_RESERVE_CANDIDATES.length).toBeGreaterThan(10);

      const twFocus = getEffectiveUniverse('TW', 'TOP30_FOCUS');
      expect(twFocus).toHaveLength(30);

      const usFocus = getEffectiveUniverse('US', 'TOP30_FOCUS');
      expect(usFocus).toHaveLength(30);

      const allFocus = getEffectiveUniverse('ALL', 'TOP30_FOCUS');
      expect(allFocus).toHaveLength(60);
    });

    it('本地有快取時，應優先讀取動態快取之最新成分股', () => {
      // 模擬先預存一份自訂快取 (將第一檔換成 9999)
      saveDynamicUniverseStorage('TW_TOP_30_FOCUS', {
        poolKey: 'TW_TOP_30_FOCUS',
        symbols: [
          { symbol: '9999', name: '測試飆股', market: 'TW', basePrice: 100 },
          ...TW_TOP_30_FOCUS_SYMBOLS.slice(1),
        ],
        lastCheckedDate: '2026-09-09',
        version: 1,
        updatedAt: Date.now(),
      });

      const twFocus = getEffectiveUniverse('TW', 'TOP30_FOCUS');
      expect(twFocus).toHaveLength(30);
      expect(twFocus[0].symbol).toBe('9999');
      expect(twFocus[0].name).toBe('測試飆股');
    });

    it('getScopedUniverseSymbols 應能透明委託動態清單', () => {
      saveDynamicUniverseStorage('US_TOP_30_FOCUS', {
        poolKey: 'US_TOP_30_FOCUS',
        symbols: [
          { symbol: 'CUSTOM_US', name: '自訂巨頭', market: 'US', basePrice: 500 },
          ...US_TOP_30_FOCUS_SYMBOLS.slice(1),
        ],
        lastCheckedDate: '2026-09-09',
        version: 1,
        updatedAt: Date.now(),
      });

      const symbols = getScopedUniverseSymbols('US', 'TOP30_FOCUS');
      expect(symbols[0].symbol).toBe('CUSTOM_US');
    });
  });

  describe('2. 存活探針 (Liveness Probe)', () => {
    it('正常可獲取報價之標的應判斷為存活 (true)', async () => {
      const mockProbeFn = vi.fn().mockResolvedValue(true);
      const isAlive = await probeSymbolLiveness('2330', 'TW', mockProbeFn);
      expect(isAlive).toBe(true);
      expect(mockProbeFn).toHaveBeenCalledWith('2330', 'TW');
    });

    it('回傳 404 或無效資料之標的應判斷為失效 (false)', async () => {
      const mockProbeFn = vi.fn().mockResolvedValue(false);
      const isAlive = await probeSymbolLiveness('INVALID_TICKER', 'US', mockProbeFn);
      expect(isAlive).toBe(false);
    });
  });

  describe('3. 自動替換與遞補 (Heal & Replace Inactive Symbol)', () => {
    it('當成分股失效時，應能自後備池遞補未重複標的並維持滿編數量', () => {
      // 假設 US_TOP_30_FOCUS 中含有舊代碼 'SQ'
      saveDynamicUniverseStorage('US_TOP_30_FOCUS', {
        poolKey: 'US_TOP_30_FOCUS',
        symbols: [
          { symbol: 'SQ', name: 'Block Inc', market: 'US', basePrice: 65 },
          ...US_TOP_30_FOCUS_SYMBOLS.slice(1),
        ],
        lastCheckedDate: '2026-09-09',
        version: 1,
        updatedAt: Date.now(),
      });

      const replacement = healInactiveSymbolInPool(
        'US_TOP_30_FOCUS',
        'SQ',
        'HTTP 404 代碼不存在或已更名'
      );

      expect(replacement).not.toBeNull();
      expect(replacement?.oldSymbol).toBe('SQ');
      expect(replacement?.newSymbol).toBeTruthy();
      expect(replacement?.newSymbol).not.toBe('SQ');

      // 檢查持久化結果
      const stored = getDynamicUniverseStorage('US_TOP_30_FOCUS');
      expect(stored).not.toBeNull();
      expect(stored?.symbols).toHaveLength(30);
      expect(stored?.symbols.some((s) => s.symbol === 'SQ')).toBe(false);
      expect(stored?.symbols.some((s) => s.symbol === replacement?.newSymbol)).toBe(true);
      expect(stored?.inactiveSymbols).toContain('SQ');
    });

    it('若欲替換之標的不存在於該池中，應返回 null 且不修改快取', () => {
      const result = healInactiveSymbolInPool('TW_TOP_30_FOCUS', 'NON_EXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('4. 每日開市前背景自動校準管線 (Daily Pre-Market Auto-Sync)', () => {
    it('同日多次進入應自動節流 (Throttling)，不重複觸發校準', async () => {
      const todayStr = '2026-09-10'; // 週四交易日
      // 初始化今天已檢查過之快取
      saveDynamicUniverseStorage('TW_TOP_30_FOCUS', {
        poolKey: 'TW_TOP_30_FOCUS',
        symbols: TW_TOP_30_FOCUS_SYMBOLS,
        lastCheckedDate: todayStr,
        version: 1,
        updatedAt: Date.now(),
      });

      const probeMock = vi.fn();
      const result = await checkAndSyncUniverseDaily({
        todayStr,
        force: false,
        probeFn: probeMock,
        poolsToCheck: ['TW_TOP_30_FOCUS'],
      });

      expect(result.hasChanges).toBe(false);
      expect(probeMock).not.toHaveBeenCalled();
      expect(result.summaryMessage).toContain('已完成成分股校準');
    });

    it('週末或法定休市日若非 force，應自動跳過校準', async () => {
      const saturday = '2026-09-12'; // 週六休市
      const probeMock = vi.fn();

      const result = await checkAndSyncUniverseDaily({
        todayStr: saturday,
        force: false,
        probeFn: probeMock,
        poolsToCheck: ['TW_TOP_30_FOCUS'],
      });

      expect(result.hasChanges).toBe(false);
      expect(probeMock).not.toHaveBeenCalled();
      expect(result.summaryMessage).toContain('非交易日');
    });

    it('跨日或 force=true 時應執行校準，偵測到失效標的時自動遞補並回傳變更摘要', async () => {
      const todayStr = '2026-09-10';
      // 設置昨天的快取，包含失效標的 'DELISTED_STOCK'
      saveDynamicUniverseStorage('TW_TOP_30_FOCUS', {
        poolKey: 'TW_TOP_30_FOCUS',
        symbols: [
          { symbol: 'DELISTED_STOCK', name: '下市股票', market: 'TW', basePrice: 50 },
          ...TW_TOP_30_FOCUS_SYMBOLS.slice(1),
        ],
        lastCheckedDate: '2026-09-09',
        version: 1,
        updatedAt: Date.now(),
      });

      // 模擬 probe：DELISTED_STOCK 回傳 false，其餘回傳 true
      const probeMock = vi.fn().mockImplementation(async (symbol: string) => {
        return symbol !== 'DELISTED_STOCK';
      });

      const result = await checkAndSyncUniverseDaily({
        todayStr,
        force: true,
        probeFn: probeMock,
        poolsToCheck: ['TW_TOP_30_FOCUS'],
      });

      expect(result.hasChanges).toBe(true);
      expect(result.replacedSymbols).toHaveLength(1);
      expect(result.replacedSymbols[0].oldSymbol).toBe('DELISTED_STOCK');
      expect(result.summaryMessage).toContain('DELISTED_STOCK');

      // 驗證存儲已被更新為今日
      const updated = getDynamicUniverseStorage('TW_TOP_30_FOCUS');
      expect(updated?.lastCheckedDate).toBe(todayStr);
      expect(updated?.symbols.some((s) => s.symbol === 'DELISTED_STOCK')).toBe(false);
      expect(updated?.symbols).toHaveLength(30);
    });
  });
});
