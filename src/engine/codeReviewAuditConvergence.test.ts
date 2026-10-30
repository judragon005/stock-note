import { describe, it, expect } from 'vitest';
import { calculatePortfolioExposure } from './riskExposureEngine';
import { calculateHoldingsAndSummary } from './calculator';
import { calculateHoldingsAttribution } from './attributionEngine';
import { calculateBehavioralAudit } from './behavioralAuditEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';

const createMockHolding = (partial: Partial<HoldingPosition>): HoldingPosition => ({
  symbol: '2330',
  name: '台積電',
  market: 'TW',
  currency: 'TWD',
  shares: 1000,
  avgCost: 1000,
  currentPrice: 1000,
  totalCostBasis: 1000000,
  marketValue: 1000000,
  grossMarketValue: 1000000,
  netMarketValue: 1000000,
  unrealizedPnL: 0,
  unrealizedPnLPercent: 0,
  unrealizedPnLBroker: 0,
  unrealizedPnLBrokerPercent: 0,
  adjustedCostBasis: 1000000,
  realizedPnL: 0,
  totalDividends: 0,
  totalCapitalReturned: 0,
  estimatedSellTax: 0,
  estimatedSellFee: 0,
  accountingMethod: 'MOVING_AVERAGE',
  ...partial,
} as HoldingPosition);

describe('Code Review 雙軸審查收斂測試 (Code Review Audit Convergence)', () => {
  describe('1. 曝險引擎淨曝險比率與應收股利計入 (Net Exposure Ratio & Receivable Dividends)', () => {
    it('全額現貨無借貸且無現金時，淨槓桿率應為 1.00x', () => {
      const holdings: HoldingPosition[] = [
        createMockHolding({
          symbol: '2330',
          shares: 1000,
          currentPrice: 1000,
          marketValue: 1000000,
        }),
      ];

      const metrics = calculatePortfolioExposure({
        holdings,
        cashBalances: { TWD: 0, USD: 0 },
        loans: [],
        usdToTwdRate: 32.0,
      });

      expect(metrics.navTWD).toBe(1000000);
      expect(metrics.grossLeverage).toBe(1.0);
      expect(metrics.netLeverage).toBe(1.0);
      expect(metrics.netExposureRatioPercent).toBe(100);
    });

    it('持有 100 萬股票且有 100 萬現金時，淨槓桿率 (Net Exposure) 應為 0.50x，而非跳變為 0.00x', () => {
      const holdings: HoldingPosition[] = [
        createMockHolding({
          symbol: '2330',
          shares: 1000,
          currentPrice: 1000,
          marketValue: 1000000,
        }),
      ];

      const metrics = calculatePortfolioExposure({
        holdings,
        cashBalances: { TWD: 1000000, USD: 0 },
        loans: [],
        usdToTwdRate: 32.0,
      });

      // NAV = 100 萬股票 + 100 萬現金 = 200 萬
      expect(metrics.navTWD).toBe(2000000);
      // 股票曝險 = 100 萬 / 200 萬 = 0.5x
      expect(metrics.netLeverage).toBeCloseTo(0.5, 2);
      expect(metrics.netExposureRatioPercent).toBeCloseTo(50, 1);
    });

    it('應收現金股利應正確納入 NAV 與 effectiveNavTWD 計算', () => {
      const holdings: HoldingPosition[] = [
        createMockHolding({
          symbol: '2330',
          shares: 1000,
          currentPrice: 1000,
          marketValue: 1000000,
        }),
      ];

      const metrics = calculatePortfolioExposure({
        holdings,
        cashBalances: { TWD: 100000, USD: 0 },
        loans: [],
        usdToTwdRate: 32.0,
        receivableDividendsTWD: 20000,
      });

      // NAV = 100 萬 (股票) + 10 萬 (現金) + 2 萬 (應收股利) = 112 萬
      expect(metrics.navTWD).toBe(1120000);
      expect(metrics.effectiveNavTWD).toBe(1120000);
    });
  });

  describe('2. calculator 投入本金會計補齊 (CB_CONVERSION & SPIN_OFF)', () => {
    it('CB_CONVERSION 可轉債轉換應計入 historicalTotalInvestedCost', () => {
      const trades: TradeRecord[] = [
        {
          id: 'cb-1',
          symbol: '6547',
          name: '高端疫苗',
          market: 'TW',
          currency: 'TWD',
          type: 'CB_CONVERSION',
          shares: 1000,
          price: 50,
          conversionPrice: 50,
          fee: 20,
          tax: 0,
          date: '2026-01-10',
          createdAt: 1000,
        },
      ];

      const { holdings } = calculateHoldingsAndSummary(trades, { '6547': 60 });
      const pos = holdings.find((h) => h.symbol === '6547');
      expect(pos).toBeDefined();
      expect(pos!.shares).toBe(1000);
      // 50 * 1000 + 20 = 50,020
      expect(pos!.historicalTotalInvestedCost).toBe(50020);
    });

    it('SPIN_OFF 分割減資應自母公司扣減移轉成本並移入子公司 historicalTotalInvestedCost', () => {
      const trades: TradeRecord[] = [
        {
          id: 'buy-parent',
          symbol: '2303',
          name: '聯電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2000,
          price: 50,
          fee: 100,
          tax: 0,
          date: '2026-01-01',
          createdAt: 1000,
        },
        {
          id: 'spinoff-child',
          symbol: '2303',
          name: '聯電',
          targetSymbol: '3035',
          targetName: '智原',
          market: 'TW',
          currency: 'TWD',
          type: 'SPIN_OFF',
          shares: 500,
          price: 0,
          allocationRatio: 0.2, // 20% 成本移轉
          fee: 0,
          tax: 0,
          date: '2026-02-01',
          createdAt: 2000,
        },
      ];

      const { holdings } = calculateHoldingsAndSummary(trades, { '2303': 50, '3035': 100 });
      const parent = holdings.find((h) => h.symbol === '2303');
      const child = holdings.find((h) => h.symbol === '3035');

      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      // 母公司初始成本 = 100,100，移轉 20% (20,020)
      expect(child!.historicalTotalInvestedCost).toBe(20020);
      expect(parent!.historicalTotalInvestedCost).toBe(100100 - 20020);
    });
  });

  describe('3. 真實在險資本 (Capital at Risk) 與未設停損統計', () => {
    it('僅對設定停損價者計算停損差額，並統計未設停損之持股檔數與比例', () => {
      const holdings: HoldingPosition[] = [
        createMockHolding({
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          shares: 1000,
          avgCost: 900,
          currentPrice: 1000,
          marketValue: 1000000,
          riskMetrics: {
            stopLossPrice: 950, // 設停損價 950，風險 = (1000 - 950) * 1000 = 50,000
            riskStatus: 'NORMAL',
          },
        }),
        createMockHolding({
          symbol: '2454',
          name: '聯發科',
          market: 'TW',
          currency: 'TWD',
          shares: 500,
          avgCost: 1200,
          currentPrice: 1200,
          marketValue: 600000,
          // 未設停損
        }),
      ];

      const attr = calculateHoldingsAttribution(holdings, 32.0);

      // 真實在險資本 = 50,000 (不強套聯發科 10% 市價)
      expect(attr.totalCapitalAtRiskTWD).toBe(50000);
      // 未設停損標的統計：1 檔 (50%)
      expect(attr.unhedgedPositionsCount).toBe(1);
      expect(attr.unhedgedPositionsPercent).toBe(50);
    });
  });

  describe('4. behavioralAuditEngine 強型別簽名與正向覆盤', () => {
    it('以標準 (trades, holdings, nav) 簽名執行行為審計，不依賴 any 多型 probe', () => {
      const trades: TradeRecord[] = [
        {
          id: 'buy-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 1000,
          fee: 50,
          tax: 0,
          date: '2026-01-01',
          createdAt: 1000,
          riskMetrics: {
            isChasingHigh: true,
            riskStatus: 'NORMAL',
          },
        },
        {
          id: 'sell-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 1000,
          price: 1100,
          fee: 50,
          tax: 300,
          date: '2026-01-10',
          createdAt: 2000,
        },
      ];

      const audit = calculateBehavioralAudit(trades, [], 1000000);
      expect(audit.fomoEntryAudit.chasingHighTradesCount).toBe(1);
      expect(audit.fomoEntryAudit.chasingHighWinRate).toBe(100);
    });
  });
});
