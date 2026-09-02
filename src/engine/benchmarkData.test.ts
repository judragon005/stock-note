import { describe, it, expect } from 'vitest';
import {
  alignBenchmarkTimeSeries,
  calculateNormalizedGrowth,
  getBenchmarkDailyPrices,
  calculate5050BalancedGrowth,
} from './benchmarkData';

describe('本地基準大盤歷史數據模組 (benchmarkData)', () => {
  describe('1. 基準歷史收盤價獲取 (getBenchmarkDailyPrices)', () => {
    it('應能正確獲取 0050.TW 內建歷史價格數據', () => {
      const prices = getBenchmarkDailyPrices('0050');
      expect(Object.keys(prices).length).toBeGreaterThan(40);
      expect(prices['2024-01-02']).toBeDefined();
    });

    it('應能正確獲取 SPY 內建歷史價格數據', () => {
      const prices = getBenchmarkDailyPrices('SPY');
      expect(Object.keys(prices).length).toBeGreaterThan(40);
      expect(prices['2024-01-02']).toBeDefined();
    });

    it('當傳入 NONE 或未知代碼時應回傳空物件', () => {
      expect(getBenchmarkDailyPrices('NONE')).toEqual({});
      expect(getBenchmarkDailyPrices('UNKNOWN' as any)).toEqual({});
    });
  });

  describe('2. 時間序列對齊與補值演算法 (alignBenchmarkTimeSeries)', () => {
    it('應依照給定的日期清單對齊基準價格，並對休市日向前填充 (Forward Fill)', () => {
      const dates = ['2026-01-05', '2026-01-06', '2026-01-07'];
      const rawPrices = {
        '2026-01-05': 100,
        '2026-01-07': 102,
        // 2026-01-06 缺漏
      };

      const aligned = alignBenchmarkTimeSeries(dates, rawPrices);
      expect(aligned).toEqual([100, 100, 102]);
    });

    it('若起始日即無數據，應向後尋找第一個有效價格 (Backfill)', () => {
      const dates = ['2026-01-01', '2026-01-02', '2026-01-03'];
      const rawPrices = {
        '2026-01-02': 150,
        '2026-01-03': 155,
      };

      const aligned = alignBenchmarkTimeSeries(dates, rawPrices);
      expect(aligned).toEqual([150, 150, 155]);
    });

    it('當輸入日期為空時應安全回傳空陣列', () => {
      expect(alignBenchmarkTimeSeries([], {})).toEqual([]);
    });
  });

  describe('3. 100% 基準走勢歸一化計算 (calculateNormalizedGrowth)', () => {
    it('應以第一天為 100.0，後續價格等比例計算百分比', () => {
      const prices = [100, 105, 110, 95];
      const growth = calculateNormalizedGrowth(prices);
      expect(growth).toEqual([100, 105, 110, 95]);
    });

    it('若起始價格非 100，應正確縮放至以 100 為基準', () => {
      const prices = [50, 55, 60, 45];
      const growth = calculateNormalizedGrowth(prices);
      expect(growth).toEqual([100, 110, 120, 90]);
    });

    it('防禦單一數據或全零數值', () => {
      expect(calculateNormalizedGrowth([])).toEqual([]);
      expect(calculateNormalizedGrowth([0, 0])).toEqual([100, 100]);
    });
  });

  describe('4. 50/50 股債/台美平衡走勢計算 (calculate5050BalancedGrowth)', () => {
    it('應正確計算 50% 0050 + 50% SPY 歸一化成長曲線', () => {
      const growthA = [100, 110, 120]; // 0050
      const growthB = [100, 100, 110]; // SPY
      const balanced = calculate5050BalancedGrowth(growthA, growthB);
      expect(balanced).toEqual([100, 105, 115]);
    });
  });
});
