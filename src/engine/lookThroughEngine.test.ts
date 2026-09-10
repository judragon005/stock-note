import { describe, it, expect } from 'vitest';
import { calculateLookThroughExposure } from './lookThroughEngine';
import { HoldingPosition } from '../types/stock';

describe('TDD Seam: lookThroughEngine (ETF 穿透透視與產業集中度聚合)', () => {
  it('若同時持有個股 2330 與 0050，應正確累加直接持股市值與穿透間接市值', () => {
    // 假設持有 1,000 股 2330 (現價 1,000 元 = 市值 100 萬)
    // 同時持有 10,000 股 0050 (現價 100 元 = 市值 100 萬，0050 內台積電佔 56.4%)
    const holdings = [
      {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        shares: 1000,
        costBasis: 800000,
        averagePrice: 800,
        currentPrice: 1000,
        marketValue: 1000000, // 100 萬
        unrealizedProfit: 200000,
        profitRate: 25,
        weightPercent: 50,
      },
      {
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        shares: 10000,
        costBasis: 900000,
        averagePrice: 90,
        currentPrice: 100,
        marketValue: 1000000, // 100 萬
        unrealizedProfit: 100000,
        profitRate: 11.11,
        weightPercent: 50,
      },
    ] as unknown as HoldingPosition[];

    const report = calculateLookThroughExposure(holdings, 32.0);

    expect(report.totalPortfolioNAV).toBe(2000000); // 總資產 200 萬
    const tsmc = report.exposures.find((e) => e.symbol === '2330');
    expect(tsmc).toBeDefined();
    expect(tsmc?.directMarketValue).toBe(1000000); // 直接持有 100 萬
    expect(tsmc?.indirectMarketValue).toBe(564000); // 來自 0050 56.4% = 56.4 萬
    expect(tsmc?.totalEffectiveValue).toBe(1564000); // 實質總曝險 156.4 萬
    expect(tsmc?.portfolioWeightPercent).toBeCloseTo(78.2, 1); // 156.4 / 200 = 78.2%
    expect(tsmc?.isConcentrationAlert).toBe(true); // > 25% 觸發警示
  });

  it('支援美股全球型 ETF (如 VT) 之匯率折算穿透', () => {
    // 持有 100 股 VT，現價 100 美元 (市值 10,000 USD，匯率 32 = 320,000 TWD)
    const holdings = [
      {
        symbol: 'VT',
        name: 'Vanguard 全球股票',
        market: 'US',
        shares: 100,
        costBasis: 300000,
        averagePrice: 93.75,
        currentPrice: 100,
        marketValue: 10000, // 原始幣別 10,000 USD
        unrealizedProfit: 20000,
        profitRate: 6.67,
        weightPercent: 100,
      },
    ] as unknown as HoldingPosition[];

    const report = calculateLookThroughExposure(holdings, 32.0);
    expect(report.totalPortfolioNAV).toBe(320000);

    const msft = report.exposures.find((e) => e.symbol === 'MSFT');
    expect(msft).toBeDefined();
    // VT 內 MSFT 佔 4.2% -> 320,000 * 0.042 = 13,440 TWD
    expect(msft?.totalEffectiveValue).toBeCloseTo(13440, 0);
  });

  it('當單一產業穿透曝險超過 50% 時，應正確點亮產業集中度警示', () => {
    // 全部持有 0050 (科技與半導體佔比超過 65%)
    const holdings = [
      {
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        shares: 1000,
        costBasis: 150000,
        averagePrice: 150,
        currentPrice: 170,
        marketValue: 170000,
        unrealizedProfit: 20000,
        profitRate: 13.33,
        weightPercent: 100,
      },
    ] as unknown as HoldingPosition[];

    const report = calculateLookThroughExposure(holdings, 32.0);
    const semiSector = report.sectorBreakdown.find((s) => s.sector === '半導體');
    expect(semiSector).toBeDefined();
    expect(semiSector?.isConcentrationAlert).toBe(true); // 半導體在 0050 佔 56.4% + 4.8% = 61.2% > 50%
  });

  it('持有未收錄之個股或小型 ETF 時，應優雅降級為獨立個體計入而不崩潰', () => {
    const holdings = [
      {
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        shares: 1000,
        costBasis: 50000,
        averagePrice: 50,
        currentPrice: 60,
        marketValue: 60000,
        unrealizedProfit: 10000,
        profitRate: 20,
        weightPercent: 100,
      },
    ] as unknown as HoldingPosition[];

    const report = calculateLookThroughExposure(holdings, 32.0);
    expect(report.exposures).toHaveLength(1);
    expect(report.exposures[0].symbol).toBe('9927');
    expect(report.exposures[0].totalEffectiveValue).toBe(60000);
    expect(report.exposures[0].isConcentrationAlert).toBe(true); // 唯一持股 100% > 25%
  });
});
