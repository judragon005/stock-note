import { describe, it, expect } from 'vitest';
import {
  calculateTurnoverMetrics,
  detectTurnoverDeterioration,
} from './financialTurnoverEngine';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Financial Turnover Efficiency & CCC Engine (TDD Seam)', () => {
  const createMockTurnoverRecord = (
    quarter: number,
    revenue: number,
    grossProfit: number,
    accountsReceivable: number,
    inventory: number
  ): QuarterlyFinancialRecord => ({
    symbol: '2330',
    market: 'TW',
    year: 2025,
    quarter,
    periodDate: `2025-0${quarter * 3}-30`,
    income: {
      revenue,
      grossProfit,
      operatingIncome: grossProfit * 0.7,
      netIncome: grossProfit * 0.6,
      eps: 5.0,
    },
    balanceSheet: {
      totalAssets: 2000000,
      totalLiabilities: 800000,
      totalEquity: 1200000,
      accountsReceivable,
      inventory,
      cashAndEquivalents: 500000,
    },
    cashFlow: {
      operatingCashFlow: 300000,
      capitalExpenditure: 100000,
    },
    updatedAt: Date.now(),
  });

  describe('1. 季度化 DSO、DIO 與 CCC 計算', () => {
    it('應能正確計算季度化應收天數與存貨天數', () => {
      // 營收 90萬, 營業毛利 45萬 (營業成本 = 45萬)
      // 應收 10萬 -> DSO = 10萬 * 90 / 90萬 = 10 天
      // 存貨 15萬 -> DIO = 15萬 * 90 / 45萬 = 30 天
      const record = createMockTurnoverRecord(1, 900000, 450000, 100000, 150000);
      const turnover = calculateTurnoverMetrics(record);

      expect(turnover.dsoDays).toBe(10);
      expect(turnover.dioDays).toBe(30);
      expect(turnover.cccDays).toBe(40); // 預設 DPO = 0
    });

    it('零除防禦：當營收或營業成本為 0 時，天數安全回傳 0', () => {
      const zeroRecord = createMockTurnoverRecord(1, 0, 0, 50000, 50000);
      const turnover = calculateTurnoverMetrics(zeroRecord);

      expect(turnover.dsoDays).toBe(0);
      expect(turnover.dioDays).toBe(0);
      expect(Number.isNaN(turnover.dsoDays)).toBe(false);
    });
  });

  describe('2. 週轉效率惡化偵測 (detectTurnoverDeterioration)', () => {
    it('當 DSO 增加超過 20 天且 DIO 增加超過 25 天時，應檢出週轉惡化警訊', () => {
      // 歷史季度 (4 季前): DSO 20 天, DIO 30 天
      const r1 = createMockTurnoverRecord(1, 900000, 450000, 200000, 150000);
      // 最新季度: DSO 50 天 (+30天), DIO 65 天 (+35天)
      const r5 = createMockTurnoverRecord(2, 900000, 450000, 500000, 325000);

      const deterioration = detectTurnoverDeterioration([r5, r1]);

      expect(deterioration.isDeteriorating).toBe(true);
      expect(deterioration.dsoIncrease).toBe(30);
      expect(deterioration.dioIncrease).toBe(35);
    });

    it('週轉天數持平或改善時，不應判定為惡化', () => {
      const r1 = createMockTurnoverRecord(1, 900000, 450000, 200000, 150000);
      const r2 = createMockTurnoverRecord(2, 900000, 450000, 180000, 140000);

      const deterioration = detectTurnoverDeterioration([r2, r1]);

      expect(deterioration.isDeteriorating).toBe(false);
    });
  });
});
