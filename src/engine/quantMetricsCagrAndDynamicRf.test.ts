import { describe, it, expect } from 'vitest';
import { resolveDynamicRiskFreeRate } from './quantMetrics';
import { calculatePerformanceMetrics } from './historicalNav';
import { PortfolioDailySnapshot } from '../types/stock';

describe('Spec 0207 / Ticket 02: 動態無風險利率與 CAGR 年化複合成長率指標', () => {
  describe('resolveDynamicRiskFreeRate', () => {
    it('美元計價 (USD) 且無宏觀殖利率時，應動態回傳 4.5%', () => {
      expect(resolveDynamicRiskFreeRate(null, 'USD')).toBe(4.5);
    });

    it('台幣計價 (TWD) 且無宏觀殖利率時，應動態回傳 1.8%', () => {
      expect(resolveDynamicRiskFreeRate(null, 'TWD')).toBe(1.8);
    });

    it('當有外部有效 FRED 美債 3M 殖利率 (如 4.38%) 時，應優先回傳該殖利率', () => {
      expect(resolveDynamicRiskFreeRate(4.38, 'USD')).toBe(4.38);
    });
  });

  describe('calculatePerformanceMetrics - CAGR 複利計算', () => {
    it('當歷時達 365 天且總淨值與本金為正時，應精確計算 CAGR 複合成長率', () => {
      // 假設 365.25 天 (1 年)，本金 100 萬，期末 120 萬 -> CAGR 應為 20.00%
      const series: PortfolioDailySnapshot[] = [
        {
          date: '2025-01-01',
          totalNAV: 1000000,
          unitNAV: 100,
          units: 10000,
          stockMarketValue: 1000000,
          cashBalance: 0,
          loanBalance: 0,
          netCostBasis: 1000000,
          cumulativeReturnPnL: 0,
          cumulativeReturnPercent: 0,
          dailyPnL: 0,
          dailyReturnPercent: 0,
          events: [],
        },
        {
          date: '2026-01-01', // 間隔 365 天
          totalNAV: 1200000,
          unitNAV: 120,
          units: 10000,
          stockMarketValue: 1200000,
          cashBalance: 0,
          loanBalance: 0,
          netCostBasis: 1000000,
          cumulativeReturnPnL: 200000,
          cumulativeReturnPercent: 20,
          dailyPnL: 0,
          dailyReturnPercent: 0,
          events: [],
        },
      ];

      const metrics = calculatePerformanceMetrics(series);
      expect(metrics.cagrPercent).toBeDefined();
      expect(metrics.cagrPercent).toBeCloseTo(20.0, 1);
    });

    it('當歷時不足 30 天時，CAGR 應為 undefined 避免過度放大短期年化失真', () => {
      const shortSeries: PortfolioDailySnapshot[] = [
        {
          date: '2026-01-01',
          totalNAV: 1000000,
          unitNAV: 100,
          units: 10000,
          stockMarketValue: 1000000,
          cashBalance: 0,
          loanBalance: 0,
          netCostBasis: 1000000,
          cumulativeReturnPnL: 0,
          cumulativeReturnPercent: 0,
          dailyPnL: 0,
          dailyReturnPercent: 0,
          events: [],
        },
        {
          date: '2026-01-10', // 僅 9 天
          totalNAV: 1100000,
          unitNAV: 110,
          units: 10000,
          stockMarketValue: 1100000,
          cashBalance: 0,
          loanBalance: 0,
          netCostBasis: 1000000,
          cumulativeReturnPnL: 100000,
          cumulativeReturnPercent: 10,
          dailyPnL: 0,
          dailyReturnPercent: 0,
          events: [],
        },
      ];

      const metrics = calculatePerformanceMetrics(shortSeries);
      expect(metrics.cagrPercent).toBeUndefined();
    });
  });
});
