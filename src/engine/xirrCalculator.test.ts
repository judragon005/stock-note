import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import {
  calculateXIRR,
  calculateNPV,
  calculateNPVDerivative,
  calculateSecurityXirr,
  calculatePortfolioXirr,
  CashFlowEvent,
} from './xirrCalculator';

describe('XIRR Core Numerical Engine (TDD)', () => {
  describe('Standard XIRR Calculation', () => {
    it('should accurately calculate 1-year simple return XIRR = 10%', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -100000, description: 'Initial Investment' },
        { date: '2025-01-01', amount: 110000, description: 'Terminal Value' },
      ];

      const result = calculateXIRR(cashFlows);

      expect(result.isAnnualized).toBe(true);
      expect(result.durationDays).toBe(366); // 2024 is a leap year (366 days)
      expect(result.ratePercent).toBeCloseTo(10.0, 1);
      expect(result.simpleReturnPercent).toBeCloseTo(10.0, 1);
      expect(result.method).toBe('NEWTON_RAPHSON');
    });

    it('should match standard Excel/Google Sheets XIRR for multi-period cash flows', () => {
      // 模擬定期定額與股息入帳：
      // 2024-01-01: -10,000 (買進)
      // 2024-04-01: -10,000 (加碼)
      // 2024-07-01: +500 (現金股利)
      // 2024-10-01: -10,000 (加碼)
      // 2025-01-01: +33,000 (期末持股市值)
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -10000 },
        { date: '2024-04-01', amount: -10000 },
        { date: '2024-07-01', amount: 500 },
        { date: '2024-10-01', amount: -10000 },
        { date: '2025-01-01', amount: 33000 },
      ];

      const result = calculateXIRR(cashFlows);

      expect(result.isAnnualized).toBe(true);
      expect(result.totalInflow).toBe(30000);
      expect(result.totalOutflow).toBe(33500);
      expect(result.simpleReturnPercent).toBeCloseTo(11.67, 1);
      // XIRR 應在 17.5% ~ 19.5% 之間（資金加權效益高於簡單收益）
      expect(result.ratePercent).toBeGreaterThan(15.0);
      expect(result.ratePercent).toBeLessThan(25.0);
    });
  });

  describe('30-Day Adaptive Guardrail (短週期平滑防護)', () => {
    it('should flag isAnnualized = false and return simple return for duration < 30 days', () => {
      // 買進 10 天後上漲 5%
      const cashFlows: CashFlowEvent[] = [
        { date: '2025-01-01', amount: -100000 },
        { date: '2025-01-11', amount: 105000 },
      ];

      const result = calculateXIRR(cashFlows);

      expect(result.durationDays).toBe(10);
      expect(result.isAnnualized).toBe(false);
      expect(result.simpleReturnPercent).toBeCloseTo(5.0, 2);
      expect(result.ratePercent).toBeCloseTo(5.0, 2);
      expect(result.method).toBe('SHORT_PERIOD');
    });

    it('should activate annualized XIRR when duration is exactly or greater than 30 days', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2025-01-01', amount: -100000 },
        { date: '2025-01-31', amount: 105000 },
      ];

      const result = calculateXIRR(cashFlows);

      expect(result.durationDays).toBe(30);
      expect(result.isAnnualized).toBe(true);
      expect(result.method).toBe('NEWTON_RAPHSON');
      expect(result.ratePercent).toBeGreaterThan(50.0); // 30天 5% 年化約 80%
    });
  });

  describe('Mathematical Boundary & Extreme Robustness', () => {
    it('should gracefully handle empty or invalid cash flows', () => {
      const result = calculateXIRR([]);
      expect(result.ratePercent).toBe(0);
      expect(result.method).toBe('TRIVIAL');
    });

    it('should return -100% when there are only negative cash flows (total loss/no terminal value)', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -50000 },
        { date: '2024-06-01', amount: -50000 },
      ];

      const result = calculateXIRR(cashFlows);
      expect(result.ratePercent).toBe(-100);
      expect(result.simpleReturnPercent).toBe(-100);
      expect(result.method).toBe('TRIVIAL');
    });

    it('should handle terminal value = 0 (total loss)', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -100000 },
        { date: '2025-01-01', amount: 0 },
      ];

      const result = calculateXIRR(cashFlows);
      expect(result.ratePercent).toBe(-100);
      expect(result.simpleReturnPercent).toBe(-100);
    });

    it('should smoothly converge for heavy losses (e.g. -70% over 1 year)', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -100000 },
        { date: '2025-01-01', amount: 30000 },
      ];

      const result = calculateXIRR(cashFlows);
      expect(result.ratePercent).toBeCloseTo(-69.9, 0);
      expect(result.isAnnualized).toBe(true);
    });

    it('should verify calculateNPV and calculateNPVDerivative correctness', () => {
      const cashFlows: CashFlowEvent[] = [
        { date: '2024-01-01', amount: -100 },
        { date: '2025-01-01', amount: 110 },
      ];

      // At r = 0.10, NPV should be close to 0
      const npv = calculateNPV(cashFlows, 0.10);
      expect(Math.abs(npv)).toBeLessThan(0.1);

      const deriv = calculateNPVDerivative(cashFlows, 0.10);
      expect(deriv).toBeLessThan(0); // Derivative of NPV with respect to r is negative
    });
  });

  describe('Multi-Level Cashflow Aggregation (三層級金流聚合)', () => {
    it('should calculate Security-Level XIRR with buy, dividends and market value', () => {
      const sampleTrades = [
        {
          id: 't1',
          symbol: '2330',
          market: 'TW' as const,
          type: 'BUY' as const,
          date: '2024-01-01',
          shares: 1000,
          price: 500,
          fee: 100,
          tax: 0,
          currency: 'TWD' as const,
          createdAt: 1,
        },
        {
          id: 't2',
          symbol: '2330',
          market: 'TW' as const,
          type: 'DIVIDEND' as const,
          date: '2024-07-01',
          shares: 1000,
          price: 0,
          cashAmount: 5000,
          fee: 10,
          tax: 0,
          currency: 'TWD' as const,
          createdAt: 2,
        },
      ];

      // 今日市值 = 1000 股 * 600 元 = 600,000
      const currentMarketValue = 600000;
      const today = '2025-01-01';

      // 呼叫個股 XIRR 函式
      const result = calculateSecurityXirr({
        symbol: '2330',
        trades: sampleTrades,
        currentMarketValue,
        today,
        currency: 'TWD',
      });

      expect(result.symbol).toBe('2330');
      expect(result.cashFlows.length).toBe(3); // Buy (-500100), Dividend (+4990), Terminal (+600000)
      expect(result.cashFlows[0].amount).toBe(-500100);
      expect(result.cashFlows[1].amount).toBe(4990);
      expect(result.cashFlows[2].amount).toBe(600000);
      expect(result.isAnnualized).toBe(true);
      expect(result.ratePercent).toBeGreaterThan(20.0);
    });

    it('should calculate Portfolio-Level XIRR with deposits and terminal NAV', () => {
      const cashTx = [
        {
          id: 'c1',
          date: '2024-01-01',
          type: 'DEPOSIT' as const,
          category: 'DEPOSIT' as const,
          amount: 1000000,
          currency: 'TWD' as const,
          accountId: 'acc1',
          createdAt: 1,
        },
      ];

      const terminalNAV = 1200000;
      const today = '2025-01-01';

      const result = calculatePortfolioXirr({
        cashTransactions: cashTx,
        trades: [],
        terminalNAV,
        today,
        baseCurrency: 'TWD',
      });

      expect(result.ratePercent).toBeCloseTo(20.0, 0);
      expect(result.isAnnualized).toBe(true);
    });

    it('Ticket #013: 當無顯式 DEPOSIT 記錄（僅有自動交易連動現金流水）時，應自適應切換 Mode B 以實質交易成本求解全組合 XIRR', () => {
      const trades: TradeRecord[] = [
        {
          id: 't-xirr-pure-1',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 500, // 500,000 + 100 fee
          fee: 100,
          tax: 0,
          date: '2024-01-01',
          createdAt: 1,
        },
      ];

      // 存在自動交易流水 (relatedTradeId)，但無手動 DEPOSIT
      const autoCashTx = [
        {
          id: 'tx-auto-t-xirr-pure-1',
          accountId: 'broker-tw-default',
          currency: 'TWD' as const,
          type: 'STOCK_BUY' as const,
          category: 'STOCK_BUY' as const,
          amount: -500100,
          date: '2024-01-01',
          relatedTradeId: 't-xirr-pure-1',
          createdAt: 1,
        },
      ];

      const terminalNAV = 600000;
      const today = '2025-01-01';

      const result = calculatePortfolioXirr({
        cashTransactions: autoCashTx,
        trades,
        terminalNAV,
        today,
        baseCurrency: 'TWD',
      });

      // 投入 500,100，一年後變 600,000，年化約 19.98%
      expect(result.ratePercent).toBeGreaterThan(15.0);
      expect(result.isAnnualized).toBe(true);
      expect(result.totalInflow).toBe(500100);
      expect(result.totalOutflow).toBe(600000);
    });
  });
});

