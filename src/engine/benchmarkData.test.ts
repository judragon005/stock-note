import { describe, it, expect } from 'vitest';
import {
  getBenchmarkDailyPrices,
  alignBenchmarkTimeSeries,
  calculateNormalizedGrowth,
  calculate5050BalancedGrowth,
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
});
