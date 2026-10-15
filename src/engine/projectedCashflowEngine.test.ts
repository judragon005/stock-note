import { describe, it, expect } from 'vitest';
import {
  generate12MonthProjectedCashflow,
  ProjectedCashflowInput,
  recommendComplementaryDividendMonths,
} from './projectedCashflowEngine';
import { HoldingPosition } from '../types/stock';

describe('Spec 0183 Ticket 02: projectedCashflowEngine (未來 12 個月現金流投影)', () => {
  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '00929',
      name: '復華台灣科技優息',
      shares: 10000,
      avgCost: 20,
      currentPrice: 21,
      marketValue: 210000,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 5,
      market: 'TW',
    },
    {
      symbol: '00878',
      name: '國泰永續高股息',
      shares: 5000,
      avgCost: 22,
      currentPrice: 23,
      marketValue: 115000,
      unrealizedPnL: 5000,
      unrealizedPnLPercent: 4.5,
      market: 'TW',
    },
    {
      symbol: '2330',
      name: '台積電',
      shares: 1000,
      avgCost: 900,
      currentPrice: 1000,
      marketValue: 1000000,
      unrealizedPnL: 100000,
      unrealizedPnLPercent: 11.1,
      market: 'TW',
    },
  ] as unknown as HoldingPosition[];

  it('1. 應正確根據當前基準月份 (如 2026-10) 產生連續 12 個月時間軸', () => {
    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: mockHoldings,
      customPayoutRates: {
        '00929': { frequency: 'MONTHLY', estimatedPerShare: 0.15 }, // 每月發 0.15
        '00878': { frequency: 'QUARTERLY', estimatedPerShare: 0.55, payoutMonths: [2, 5, 8, 11] }, // 2, 5, 8, 11 月發放
        '2330': { frequency: 'QUARTERLY', estimatedPerShare: 4.5, payoutMonths: [1, 4, 7, 10] }, // 1, 4, 7, 10 月發放
      },
    };

    const projection = generate12MonthProjectedCashflow(input);

    expect(projection.months).toHaveLength(12);
    expect(projection.months[0].yearMonth).toBe('2026-10');
    expect(projection.months[11].yearMonth).toBe('2027-09');

    // 2026-10 月份應包含 00929 (10,000 * 0.15 = 1,500) 與 2330 (1,000 * 4.5 = 4,500) = 6,000
    const oct2026 = projection.months[0];
    expect(oct2026.estimatedTotalTwd).toBe(6000);
    expect(oct2026.breakdown).toHaveLength(2);

    // 2026-11 月份應包含 00929 (1,500) 與 00878 (5,000 * 0.55 = 2,750) = 4,250
    const nov2026 = projection.months[1];
    expect(nov2026.estimatedTotalTwd).toBe(4250);

    // 2026-12 月份僅有 00929 (1,500)
    const dec2026 = projection.months[2];
    expect(dec2026.estimatedTotalTwd).toBe(1500);
  });

  it('2. 應準確計算月均股息並辨識枯水期月份 (低於月均 50%)', () => {
    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: mockHoldings,
      customPayoutRates: {
        '00929': { frequency: 'MONTHLY', estimatedPerShare: 0.15 }, // 12 * 1,500 = 18,000
        '00878': { frequency: 'QUARTERLY', estimatedPerShare: 0.55, payoutMonths: [2, 5, 8, 11] }, // 4 * 2,750 = 11,000
        '2330': { frequency: 'QUARTERLY', estimatedPerShare: 4.5, payoutMonths: [1, 4, 7, 10] }, // 4 * 4,500 = 18,000
      },
    };

    const projection = generate12MonthProjectedCashflow(input);
    // 全年總預估 = 18,000 + 11,000 + 18,000 = 47,000
    // 月均 = 47,000 / 12 ≈ 3,916.67
    // 枯水期閥值 (50%) ≈ 1,958.33
    expect(projection.annualTotalTwd).toBe(47000);
    expect(Math.round(projection.monthlyAverageTwd)).toBe(3917);

    // 2026-12 只有 1,500，低於 1,958.33，應標記為 isDrySeason = true
    const dec2026 = projection.months.find((m) => m.yearMonth === '2026-12');
    expect(dec2026?.isDrySeason).toBe(true);

    // 2026-10 有 6,000，不應標記為枯水期
    const oct2026 = projection.months.find((m) => m.yearMonth === '2026-10');
    expect(oct2026?.isDrySeason).toBe(false);
  });

  it('3. detectDrySeasonMonths 與 recommendComplementaryDividendMonths 應能產出互補標的配息建議', () => {
    const drySeasonMonths = [3, 6, 9, 12]; // 缺少 3, 6, 9, 12 月現金流
    const recommendations = recommendComplementaryDividendMonths(drySeasonMonths);

    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
    // 應推薦配息月份包含 3, 6, 9, 12 的熱門 ETF (如 00919、00713 等)
    expect(recommendations.some((r) => r.symbol === '00919' || r.symbol === '00713')).toBe(true);
  });
});
