import { describe, it, expect } from 'vitest';
import {
  calculateAllocationDrift,
  generateCashInRebalancePlan,
  generateFullRebalancePlan,
  convertAmountToOrderUnits,
  estimateTransactionFriction,
} from './rebalancingEngine';
import { TargetAllocationConfig } from '../types/allocation';
import { HoldingPosition } from '../types/stock';

describe('Rebalancing Engine (再平衡運算引擎)', () => {
  const sampleHoldings: HoldingPosition[] = [
    {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 1000,
      avgCost: 800,
      totalCostBasis: 800000,
      adjustedCostBasis: 800000,
      currentPrice: 1000,
      marketValue: 1000000,
      grossMarketValue: 1000000,
      estimatedSellTax: 3000,
      estimatedSellFee: 1425,
      netMarketValue: 995575,
      unrealizedPnL: 200000,
      unrealizedPnLPercent: 25,
      unrealizedPnLBroker: 195575,
      unrealizedPnLBrokerPercent: 24.45,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 200000,
      totalReturnPercent: 25,
      yieldOnCostPercent: 0,
    },
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      shares: 2000,
      avgCost: 150,
      totalCostBasis: 300000,
      adjustedCostBasis: 300000,
      currentPrice: 180,
      marketValue: 360000,
      grossMarketValue: 360000,
      estimatedSellTax: 360,
      estimatedSellFee: 513,
      netMarketValue: 359127,
      unrealizedPnL: 60000,
      unrealizedPnLPercent: 20,
      unrealizedPnLBroker: 59127,
      unrealizedPnLBrokerPercent: 19.7,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 60000,
      totalReturnPercent: 20,
      yieldOnCostPercent: 0,
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      shares: 50,
      avgCost: 200,
      totalCostBasis: 10000,
      adjustedCostBasis: 10000,
      currentPrice: 220,
      marketValue: 11000, // 11,000 USD * 32 = 352,000 TWD
      grossMarketValue: 11000,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      netMarketValue: 11000,
      unrealizedPnL: 1000,
      unrealizedPnLPercent: 10,
      unrealizedPnLBroker: 1000,
      unrealizedPnLBrokerPercent: 10,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 1000,
      totalReturnPercent: 10,
      yieldOnCostPercent: 0,
    },
  ];

  const usdToTwdRate = 32;
  const cashBalanceTwd = 288000; // 總淨值 = 1,000,000 + 360,000 + 352,000 + 288,000 = 2,000,000 TWD

  describe('1. 偏離度分析 (calculateAllocationDrift)', () => {
    it('市場層級 (TW / US / CASH) 應精準計算實際佔比與偏離度', () => {
      // 總市值 = 2,000,000 TWD
      // TW: 1,360,000 (68%)
      // US: 352,000 (17.6%)
      // CASH: 288,000 (14.4%)
      const config: TargetAllocationConfig = {
        id: 'test-market',
        type: 'MARKET',
        name: '測試市場配置',
        items: [
          { key: 'TW', name: '台股部位', targetPercent: 50 },
          { key: 'US', name: '美股部位', targetPercent: 30 },
          { key: 'CASH', name: '現金儲備', targetPercent: 20 },
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const driftItems = calculateAllocationDrift(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      expect(driftItems.length).toBe(3);

      const twItem = driftItems.find((i) => i.key === 'TW')!;
      expect(twItem.currentPercent).toBeCloseTo(68.0, 1);
      expect(twItem.targetPercent).toBe(50);
      expect(twItem.driftPercent).toBeCloseTo(18.0, 1); // +18% 超配
      expect(twItem.status).toBe('SEVERE_DRIFT'); // > 2 * 5%

      const usItem = driftItems.find((i) => i.key === 'US')!;
      expect(usItem.currentPercent).toBeCloseTo(17.6, 1);
      expect(usItem.targetPercent).toBe(30);
      expect(usItem.driftPercent).toBeCloseTo(-12.4, 1); // -12.4% 低配
      expect(usItem.status).toBe('SEVERE_DRIFT');

      const cashItem = driftItems.find((i) => i.key === 'CASH')!;
      expect(cashItem.currentPercent).toBeCloseTo(14.4, 1);
      expect(cashItem.targetPercent).toBe(20);
      expect(cashItem.driftPercent).toBeCloseTo(-5.6, 1);
      expect(cashItem.status).toBe('MILD_DRIFT'); // 5% < 5.6% <= 10%
    });

    it('個股層級 (Symbol-level) 應精確計算個別標的佔比與狀態', () => {
      // 總市值 = 2,000,000 TWD
      // 2330: 1,000,000 (50%)
      // 0050: 360,000 (18%)
      // AAPL: 352,000 (17.6%)
      const config: TargetAllocationConfig = {
        id: 'test-symbols',
        type: 'SYMBOL',
        name: '測試個股配置',
        items: [
          { key: '2330', name: '台積電', targetPercent: 48 }, // 偏離 +2% -> BALANCED
          { key: '0050', name: '元大台灣50', targetPercent: 25 }, // 偏離 -7% -> MILD_DRIFT
          { key: 'AAPL', name: '蘋果', targetPercent: 27 }, // 偏離 -9.4% -> MILD_DRIFT
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const driftItems = calculateAllocationDrift(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      const tsmc = driftItems.find((i) => i.key === '2330')!;
      expect(tsmc.driftPercent).toBeCloseTo(2.0, 1);
      expect(tsmc.status).toBe('BALANCED');

      const t0050 = driftItems.find((i) => i.key === '0050')!;
      expect(t0050.driftPercent).toBeCloseTo(-7.0, 1);
      expect(t0050.status).toBe('MILD_DRIFT');
    });
  });

  describe('2. 定期注水加碼再平衡 (generateCashInRebalancePlan)', () => {
    it('注水資金優先分配給低配標的，絕不產生賣出動作', () => {
      const config: TargetAllocationConfig = {
        id: 'test-cashin',
        type: 'SYMBOL',
        name: '個股注水加碼',
        items: [
          { key: '2330', name: '台積電', targetPercent: 40 }, // 現值 100萬 (58.4%)
          { key: '0050', name: '元大台灣50', targetPercent: 30 }, // 現值 36萬 (21.0%)
          { key: 'AAPL', name: '蘋果', targetPercent: 30 }, // 現值 35.2萬 (20.6%)
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      // 總股票市值 = 1,712,000 TWD，注水加碼 288,000 TWD ➔ 新總值 = 2,000,000 TWD
      // 目標值：2330 = 80萬, 0050 = 60萬, AAPL = 60萬
      // 缺口：0050 缺 240,000 TWD, AAPL 缺 248,000 TWD，合計缺口 488,000 TWD
      // 可注水 288,000 TWD < 488,000 TWD ➔ 依缺口比例分配給 0050 與 AAPL，2330 為 0
      const plan = generateCashInRebalancePlan(config, sampleHoldings, 288000, cashBalanceTwd, usdToTwdRate);

      expect(plan.mode).toBe('CASH_IN');
      expect(plan.cashInflowTwd).toBe(288000);
      expect(plan.summary.totalSellAmountTwd).toBe(0); // 絕不賣出

      const tsmc = plan.recommendations.find((r) => r.key === '2330')!;
      expect(tsmc.action).toBe('HOLD');
      expect(tsmc.recommendedAmountTwd).toBe(0);

      const t0050 = plan.recommendations.find((r) => r.key === '0050')!;
      expect(t0050.action).toBe('BUY');
      expect(t0050.recommendedAmountTwd).toBeGreaterThan(0);

      const aapl = plan.recommendations.find((r) => r.key === 'AAPL')!;
      expect(aapl.action).toBe('BUY');
      expect(aapl.recommendedAmountTwd).toBeGreaterThan(0);

      // 總買入金額應等於注水金額
      expect(plan.summary.totalBuyAmountTwd).toBeCloseTo(288000, -1);
    });
  });

  describe('3. 全量買賣再平衡 (generateFullRebalancePlan)', () => {
    it('超配標的賣出、低配標的加碼，且買賣總金額平衡', () => {
      const config: TargetAllocationConfig = {
        id: 'test-full',
        type: 'SYMBOL',
        name: '全量再平衡',
        items: [
          { key: '2330', name: '台積電', targetPercent: 40 }, // 目標 40% (80萬) ➔ 賣出 20萬
          { key: '0050', name: '元大台灣50', targetPercent: 30 }, // 目標 30% (60萬) ➔ 買進 24萬
          { key: 'AAPL', name: '蘋果', targetPercent: 30 }, // 目標 30% (60萬) ➔ 買進 24.8萬 (扣除現金差額)
        ],
        toleranceBandPercent: 5.0,
        updatedAt: Date.now(),
      };

      const plan = generateFullRebalancePlan(config, sampleHoldings, cashBalanceTwd, usdToTwdRate);

      expect(plan.mode).toBe('FULL_REBALANCE');

      const tsmc = plan.recommendations.find((r) => r.key === '2330')!;
      expect(tsmc.action).toBe('SELL');
      expect(tsmc.recommendedAmountTwd).toBeCloseTo(200000, -2);

      const t0050 = plan.recommendations.find((r) => r.key === '0050')!;
      expect(t0050.action).toBe('BUY');
      expect(t0050.recommendedAmountTwd).toBeCloseTo(240000, -2);

      const aapl = plan.recommendations.find((r) => r.key === 'AAPL')!;
      expect(aapl.action).toBe('BUY');
      expect(aapl.recommendedAmountTwd).toBeCloseTo(248000, -2);
      expect(aapl.recommendedAmountOriginal).toBeCloseTo(248000 / 32, 1);
    });
  });

  describe('4. 下單顆粒度與摩擦成本試算 (convertAmountToOrderUnits & friction)', () => {
    it('台股應正確拆解整張與零股', () => {
      // 建議買進 250,000 元，單價 100 元 ➔ 2,500 股 ➔ 2 張 + 500 股
      const units = convertAmountToOrderUnits('TW', 100, 250000, 'TWD', 32);
      expect(units.shares).toBe(2500);
      expect(units.lotsSummary).toBe('2 張 + 500 股');
    });

    it('美股應支援小數點碎股精算', () => {
      // 建議買進 1,000 USD，單價 300 USD ➔ 3.333 股
      const units = convertAmountToOrderUnits('US', 300, 32000, 'USD', 32);
      expect(units.shares).toBe(3.333);
      expect(units.lotsSummary).toBe('3.333 股');
    });

    it('摩擦成本估算應考量台股 0.1425% 買費與 0.3% 賣稅', () => {
      const frictionBuy = estimateTransactionFriction('TW', 'BUY', 100000);
      expect(frictionBuy).toBe(Math.round(100000 * 0.001425));

      const frictionSell = estimateTransactionFriction('TW', 'SELL', 100000);
      expect(frictionSell).toBe(Math.round(100000 * (0.001425 + 0.003)));
    });
  });
});
