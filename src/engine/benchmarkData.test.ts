import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBenchmarkDailyPrices,
  alignBenchmarkTimeSeries,
  calculateNormalizedGrowth,
  calculate5050BalancedGrowth,
  loadBenchmarkDailyPricesAsync,
  resetBenchmarkCacheForTesting,
} from './benchmarkData';

describe('Benchmark Data Engine (benchmarkData.ts)', () => {
  describe('getBenchmarkDailyPrices', () => {
    it('應支援 TAIEX 台股加權指數基準並回傳非空字典', () => {
      const prices = getBenchmarkDailyPrices('TAIEX');
      expect(prices).toBeDefined();
      expect(typeof prices).toBe('object');
      const dates = Object.keys(prices);
      expect(dates.length).toBeGreaterThan(100);
      // 驗證最新 2026-09-07 數據點位
      expect(prices['2026-09-07']).toBeCloseTo(47326.27, 1);
    });

    it('應支援 0050 元大台灣50基準', () => {
      const prices = getBenchmarkDailyPrices('0050');
      expect(prices).toBeDefined();
      expect(prices['2024-01-02']).toBeDefined();
      expect(prices['2026-09-07']).toBeDefined();
    });

    it('應支援 SPY 標普500基準', () => {
      const prices = getBenchmarkDailyPrices('SPY');
      expect(prices).toBeDefined();
      expect(prices['2024-01-02']).toBeDefined();
    });

    it('若輸入 NONE 或未知基準，應回傳空字典', () => {
      expect(getBenchmarkDailyPrices('NONE')).toEqual({});
      expect(getBenchmarkDailyPrices('UNKNOWN' as any)).toEqual({});
    });
  });

  describe('alignBenchmarkTimeSeries', () => {
    it('當 dates 為空時，應回傳空陣列', () => {
      expect(alignBenchmarkTimeSeries([], { '2026-01-01': 100 })).toEqual([]);
    });

    it('當基準資料完全為空時，應預設填入 100', () => {
      const result = alignBenchmarkTimeSeries(['2026-01-01', '2026-01-02'], {});
      expect(result).toEqual([100, 100]);
    });

    it('應能正確對齊並進行 Forward-fill 與 Back-fill', () => {
      const rawPrices = {
        '2026-01-02': 200,
        '2026-01-05': 210,
      };
      // 2026-01-01 無資料應 Back-fill 為 200
      // 2026-01-03、2026-01-04 無資料應 Forward-fill 為 200
      // 2026-01-05 為 210
      const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
      const aligned = alignBenchmarkTimeSeries(dates, rawPrices);
      expect(aligned).toEqual([200, 200, 200, 200, 210]);
    });
  });

  describe('calculateNormalizedGrowth', () => {
    it('應將起始價格標準化為 100，後續依比例增長', () => {
      const prices = [200, 220, 180, 240];
      const growth = calculateNormalizedGrowth(prices);
      expect(growth).toEqual([100, 110, 90, 120]);
    });

    it('空陣列應回傳空陣列', () => {
      expect(calculateNormalizedGrowth([])).toEqual([]);
    });
  });

  describe('calculate5050BalancedGrowth', () => {
    it('應精準計算 50% 0050 + 50% SPY 平衡組合', () => {
      const g0050 = [100, 110, 120];
      const gSPY = [100, 90, 110];
      const balanced = calculate5050BalancedGrowth(g0050, gSPY);
      expect(balanced).toEqual([100, 100, 115]);
    });
  });

  describe('loadBenchmarkDailyPricesAsync (Ticket 05: 湖倉 SQLite API 與記憶體快取)', () => {
    beforeEach(() => {
      resetBenchmarkCacheForTesting();
    });

    it('應能正確呼叫 /api/market/history/:symbol?limit=all 並轉換為每日價格字典', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'SPY',
          candles: [
            { date: '2026-01-02', close: 580.5 },
            { date: '2026-01-03', close: 585.2 },
          ],
        }),
      });

      const prices = await loadBenchmarkDailyPricesAsync('SPY', mockFetch);
      expect(mockFetch).toHaveBeenCalledWith('/api/market/history/SPY?limit=all', expect.anything());
      expect(prices).toEqual({
        '2026-01-02': 580.5,
        '2026-01-03': 585.2,
      });

      // 第二次呼叫時應直接命中快取，不應再次呼叫 mockFetch
      const cached = await loadBenchmarkDailyPricesAsync('SPY', mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(cached).toEqual(prices);
    });

    it('當 API 網路異常或回傳非 200 時，應安全 fallback 降級為靜態常數不崩潰', async () => {
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      const fallback = await loadBenchmarkDailyPricesAsync('0050', failingFetch);
      expect(fallback).toBeDefined();
      expect(fallback['2024-01-02']).toBeDefined();
    });

    it('當 API 回傳空 candles 或非陣列時，應降級為靜態常數', async () => {
      const emptyFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ symbol: 'TAIEX', candles: [] }),
      });
      const fallback = await loadBenchmarkDailyPricesAsync('TAIEX', emptyFetch);
      expect(fallback).toBeDefined();
      expect(fallback['2026-09-07']).toBeCloseTo(47326.27, 1);
    });
  });
});

