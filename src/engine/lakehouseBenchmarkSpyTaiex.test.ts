// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBenchmarkDailyPrices,
  loadBenchmarkDailyPricesAsync,
  resetBenchmarkCacheForTesting,
} from './benchmarkData';

describe('Spec 0188 / Ticket 04: 大盤基準 SPY/TAIEX 假數據拔除與湖倉優先直讀 (TDD: Red)', () => {
  beforeEach(() => {
    resetBenchmarkCacheForTesting();
  });

  it('1. loadBenchmarkDailyPricesAsync 應能從 /api/market/history/SPY?limit=all 提取真實日 K 並注入基準字典', async () => {
    const mockFetcher = async (url: string) => {
      if (url.includes('/api/market/history/SPY')) {
        return {
          ok: true,
          json: async () => ({
            symbol: 'SPY',
            candles: [
              { date: '2026-10-14', close: 585.5 },
              { date: '2026-10-15', close: 588.2 },
            ],
          }),
        };
      }
      return { ok: false };
    };

    const prices = await loadBenchmarkDailyPricesAsync('SPY', mockFetcher);
    expect(prices['2026-10-14']).toBe(585.5);
    expect(prices['2026-10-15']).toBe(588.2);

    // 驗證同步方法 getBenchmarkDailyPrices 亦能直接讀取到注入後的真實價格
    const syncPrices = getBenchmarkDailyPrices('SPY');
    expect(syncPrices['2026-10-15']).toBe(588.2);
  });

  it('2. 當 API 失敗或無真實數據時，應安全降級回傳保底常數，確保系統零崩潰', async () => {
    const mockFailedFetcher = async () => ({ ok: false, status: 500 });
    const prices = await loadBenchmarkDailyPricesAsync('SPY', mockFailedFetcher);

    expect(prices).toBeDefined();
    expect(typeof prices).toBe('object');
    expect(prices['2024-01-02']).toBeDefined(); // 降級保底
  });
});
