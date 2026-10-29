import { describe, it, expect } from 'vitest';
import {
  calculateHoldingsAttribution,
  sortHoldingsByInstitutionalField,
  formatPrivacyMasked,
} from './attributionEngine';
import { HoldingPosition } from '../types/stock';

function createMockHolding(overrides: Partial<HoldingPosition>): HoldingPosition {
  return {
    symbol: 'MOCK',
    name: 'Mock Stock',
    market: 'TW',
    currency: 'TWD',
    shares: 1000,
    avgCost: 100,
    totalCostBasis: 100000,
    adjustedCostBasis: 100000,
    currentPrice: 100,
    marketValue: 100000,
    grossMarketValue: 100000,
    estimatedSellTax: 300,
    estimatedSellFee: 142,
    netMarketValue: 99558,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    unrealizedPnLBroker: 0,
    unrealizedPnLBrokerPercent: 0,
    realizedPnL: 0,
    totalDividends: 0,
    totalCapitalReturned: 0,
    totalStockDividendsShares: 0,
    totalReturnPnL: 0,
    totalReturnPercent: 0,
    yieldOnCostPercent: 0,
    lots: [],
    ...overrides,
  };
}

describe('Spec 0208 Ticket 08: Institutional UI Attribution & Controls Engine', () => {
  const holdings: HoldingPosition[] = [
    createMockHolding({
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 1000,
      marketValue: 600000,
      todaysPnL: 12000, // 今日漲 12,000 TWD
      totalReturnPercent: 20.0,
    }),
    createMockHolding({
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      shares: 2000,
      marketValue: 400000,
      todaysPnL: -4000, // 今日跌 4,000 TWD
      totalReturnPercent: 5.0,
    }),
    createMockHolding({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      shares: 0, // 已平倉標的，不計入在庫權重
      marketValue: 0,
      todaysPnL: 0,
      totalReturnPercent: 15.0,
    }),
  ];

  it('1. 個股權重與今日貢獻度 (bps) 計算精確', () => {
    // 總在席市值 600,000 + 400,000 = 1,000,000 TWD
    const result = calculateHoldingsAttribution(holdings, 32.0);

    expect(result.totalMarketValueTWD).toBe(1000000);
    expect(result.items['2330'].weightPercent).toBe(60.0);
    // 台積電今日貢獻: 12,000 / 1,000,000 * 10,000 = +120 bps
    expect(result.items['2330'].todaysContributionBps).toBe(120);

    expect(result.items['0050'].weightPercent).toBe(40.0);
    // 0050 今日貢獻: -4,000 / 1,000,000 * 10,000 = -40 bps
    expect(result.items['0050'].todaysContributionBps).toBe(-40);

    // 已平倉標的權重為 0
    expect(result.items['AAPL'].weightPercent).toBe(0);
    expect(result.items['AAPL'].todaysContributionBps).toBe(0);
  });

  it('2. HHI 集中度指數與風險等級判定', () => {
    // 權重為 60% 與 40%
    // HHI = 60^2 + 40^2 = 3600 + 1600 = 5200 (> 2500，高度集中)
    const result = calculateHoldingsAttribution(holdings, 32.0);
    expect(result.hhi).toBe(5200);
    expect(result.hhiLevel).toBe('CONCENTRATED');
  });

  it('3. 表頭排序演算法：支援按今日貢獻度 (bps) 與權重 (%) 排序', () => {
    const result = calculateHoldingsAttribution(holdings, 32.0);

    // 按貢獻度降冪：台積電 (+120 bps) > 0050 (-40 bps)
    const sortedByBpsDesc = sortHoldingsByInstitutionalField(
      holdings,
      result.items,
      'CONTRIBUTION_BPS',
      'DESC'
    );
    expect(sortedByBpsDesc[0].symbol).toBe('2330');

    // 按貢獻度升冪：0050 (-40 bps) < 台積電 (+120 bps)
    const sortedByBpsAsc = sortHoldingsByInstitutionalField(
      holdings,
      result.items,
      'CONTRIBUTION_BPS',
      'ASC'
    );
    expect(sortedByBpsAsc[0].symbol).toBe('0050');
  });

  it('4. 隱私遮罩轉換：啟用時所有金額轉為遮罩字串', () => {
    expect(formatPrivacyMasked('NT$ 1,000,000', false)).toBe('NT$ 1,000,000');
    expect(formatPrivacyMasked('NT$ 1,000,000', true)).toBe('••••••');
    expect(formatPrivacyMasked(100000, true)).toBe('••••••');
  });
  it('5. 跨市場跨幣別市值排序：美股依 USD 匯率折算為 TWD 比較', () => {
    const twHolding = createMockHolding({
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      marketValue: 10000, // 10,000 TWD
      shares: 10,
    });
    const usHolding = createMockHolding({
      symbol: 'AAPL',
      market: 'US',
      currency: 'USD',
      marketValue: 500, // 500 USD * 32 = 16,000 TWD (> 10,000 TWD)
      shares: 5,
    });

    const sortedDesc = sortHoldingsByInstitutionalField(
      [twHolding, usHolding],
      {},
      'MARKET_VALUE',
      'DESC',
      32.0
    );
    // 折算後 AAPL (16,000 TWD) 應排在 2330 (10,000 TWD) 前面
    expect(sortedDesc[0].symbol).toBe('AAPL');
    expect(sortedDesc[1].symbol).toBe('2330');
  });
});