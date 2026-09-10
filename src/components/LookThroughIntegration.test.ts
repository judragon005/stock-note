import { describe, it, expect } from 'vitest';
import { calculateLookThroughExposure } from '../engine/lookThroughEngine';
import { HoldingPosition } from '../types/stock';

describe('TDD Seam: LookThrough Treemap & Breakdown Drawer 整合測試 (Tickets 09 & 10)', () => {
  const sampleHoldings = [
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      shares: 10000,
      costBasis: 1500000,
      averagePrice: 150,
      currentPrice: 180,
      marketValue: 1800000,
      unrealizedProfit: 300000,
      profitRate: 20,
      weightPercent: 60,
    },
    {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      shares: 1000,
      costBasis: 800000,
      averagePrice: 800,
      currentPrice: 1000,
      marketValue: 1000000,
      unrealizedProfit: 200000,
      profitRate: 25,
      weightPercent: 40,
    },
  ] as unknown as HoldingPosition[];

  it('穿透模式下台積電之總曝險應精準結合直接持股與 0050 穿透並觸發集中度警示', () => {
    const report = calculateLookThroughExposure(sampleHoldings, 32.0);
    expect(report.totalPortfolioNAV).toBe(2800000);

    const tsmc = report.exposures.find((e) => e.symbol === '2330');
    expect(tsmc).toBeDefined();
    // 0050 內 2330 佔 56.4% -> 1,800,000 * 0.564 = 1,015,200
    // 直接持有 = 1,000,000
    // 總曝險 = 2,015,200
    expect(tsmc?.directMarketValue).toBe(1000000);
    expect(tsmc?.indirectMarketValue).toBeCloseTo(1015200, 0);
    expect(tsmc?.totalEffectiveValue).toBeCloseTo(2015200, 0);
    expect(tsmc?.portfolioWeightPercent).toBeCloseTo(71.97, 1);
    expect(tsmc?.isConcentrationAlert).toBe(true);

    // 抽屜來源資料驗證
    expect(tsmc?.derivedSources).toHaveLength(1);
    expect(tsmc?.derivedSources[0].etfSymbol).toBe('0050');
    expect(tsmc?.derivedSources[0].weightInETF).toBe(56.4);
  });
});
