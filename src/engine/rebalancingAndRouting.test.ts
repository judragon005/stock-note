import { describe, it, expect } from 'vitest';
import {
  generateFullRebalancePlan,
  generateCashInRebalancePlan,
} from './rebalancingEngine';
import { HoldingPosition } from '../types/stock';
import { TargetAllocationConfig } from '../types/allocation';

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

describe('Spec 0208 Ticket 07: Rebalancing Defense & Order Routing', () => {
  const mockHoldings: HoldingPosition[] = [
    createMockHolding({
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      shares: 1000,
      currentPrice: 150,
      marketValue: 150000,
      grossMarketValue: 150000,
      totalCostBasis: 140000,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 7.14,
      totalReturnPercent: 7.14,
    }),
    createMockHolding({
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 100,
      currentPrice: 1000,
      marketValue: 100000,
      grossMarketValue: 100000,
      totalCostBasis: 90000,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 11.11,
      totalReturnPercent: 11.11,
    }),
  ];

  it('1. 容忍帶防護：偏離未達容忍帶門檻時，即使偏離金額 >= 1000 也不應觸發交易 (HOLD)', () => {
    // 總資產 250,000。0050 市值 150,000 (60%)，目標設 58% (偏離 +2.0%)。
    // 容忍帶設為 5.0%。
    // 差額為 250,000 * 2% = 5,000 元 (>= 1,000 元)。
    // 因為偏離幅度 2.0% <= 5.0% 容忍帶，因此應該 HOLD，不能賣出。
    const config: TargetAllocationConfig = {
      id: 'cfg-tolerance',
      name: '容忍帶測試',
      type: 'SYMBOL',
      toleranceBandPercent: 5.0,
      updatedAt: 1700000000000,
      items: [
        { key: '0050', targetPercent: 58 },
        { key: '2330', targetPercent: 42 },
      ],
    };

    const plan = generateFullRebalancePlan(config, mockHoldings, 0, 32);
    const item0050 = plan.recommendations.find((r) => r.key === '0050');
    expect(item0050).toBeDefined();
    // 偏離幅度 2% <= 5%，應保持 HOLD
    expect(item0050?.action).toBe('HOLD');
    expect(item0050?.recommendedAmountTwd).toBe(0);
  });

  it('2. 容忍帶生效：偏離幅度超過容忍帶且金額顯著時，才觸發調倉 (SELL / BUY)', () => {
    // 0050 當前 60%，目標設為 50% (偏離 +10.0% > 5.0% 容忍帶)
    const config: TargetAllocationConfig = {
      id: 'cfg-drift-exceeded',
      name: '偏離超標測試',
      type: 'SYMBOL',
      toleranceBandPercent: 5.0,
      updatedAt: 1700000000000,
      items: [
        { key: '0050', targetPercent: 50 },
        { key: '2330', targetPercent: 50 },
      ],
    };

    const plan = generateFullRebalancePlan(config, mockHoldings, 0, 32);
    const item0050 = plan.recommendations.find((r) => r.key === '0050');
    expect(item0050?.action).toBe('SELL');
    expect(item0050?.recommendedAmountTwd).toBe(25000); // 150,000 - 125,000
  });

  it('3. 非目標持股全額賣出：在倉持有非目標標的 (2330) 時，建議清單中明確包含全額賣出指令', () => {
    // 目標配置只包含 0050 (100%)，不含 2330
    const config: TargetAllocationConfig = {
      id: 'cfg-exclude-2330',
      name: '純ETF配置',
      type: 'SYMBOL',
      toleranceBandPercent: 5.0,
      updatedAt: 1700000000000,
      items: [{ key: '0050', targetPercent: 100 }],
    };

    const plan = generateFullRebalancePlan(config, mockHoldings, 0, 32);
    // 必須產出 2330 的賣出推薦
    const item2330 = plan.recommendations.find((r) => r.key.toUpperCase() === '2330');
    expect(item2330).toBeDefined();
    expect(item2330?.action).toBe('SELL');
    expect(item2330?.targetPercent).toBe(0);
    expect(item2330?.recommendedAmountTwd).toBe(100000);
    expect(item2330?.recommendedShares).toBe(100);
  });

  it('4. 定期注水再平衡：注水 0 時總資產無重複計算現金', () => {
    const config: TargetAllocationConfig = {
      id: 'cfg-cash-in',
      name: '注水測試',
      type: 'SYMBOL',
      toleranceBandPercent: 5.0,
      updatedAt: 1700000000000,
      items: [
        { key: '0050', targetPercent: 50 },
        { key: '2330', targetPercent: 50 },
      ],
    };

    // 持股市值 250,000，可用現金 50,000
    // 當外部注水 0 時，新總資產必須是 300,000，而非 350,000
    const plan = generateCashInRebalancePlan(config, mockHoldings, 0, 50000, 32);
    expect(plan.newTotalValueTwd).toBe(300000);
  });

  it('5. 台股代碼正則路由驗證：支援 00679B, 00632R, 00631L 等英數混合台股標的', () => {
    const twRegex = /^[0-9]{4,6}[A-Za-z]?$/;
    expect(twRegex.test('2330')).toBe(true);
    expect(twRegex.test('0050')).toBe(true);
    expect(twRegex.test('00679B')).toBe(true);
    expect(twRegex.test('00632R')).toBe(true);
    expect(twRegex.test('00631L')).toBe(true);
    expect(twRegex.test('2882A')).toBe(true);

    // 美股代碼不應匹配
    expect(twRegex.test('AAPL')).toBe(false);
    expect(twRegex.test('TSLA')).toBe(false);
    expect(twRegex.test('NVDA')).toBe(false);
    expect(twRegex.test('BRK.B')).toBe(false);
  });
});
