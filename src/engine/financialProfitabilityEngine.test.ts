import { describe, it, expect } from 'vitest';
import {
  calculateProfitabilityMetrics,
  calculateDuPontAnalysis,
  analyzeMarginTrend,
  calculateCoreBusinessPurity,
  calculateOperatingLeverage,
} from './financialProfitabilityEngine';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Financial Profitability & DuPont Analysis Engine (TDD Seam)', () => {
  const createMockRecord = (
    quarter: number,
    revenue: number,
    grossProfit: number,
    operatingIncome: number,
    netIncome: number,
    totalAssets = 1000000,
    totalEquity = 500000,
    eps = 2.5
  ): QuarterlyFinancialRecord => ({
    symbol: '2330',
    market: 'TW',
    year: 2025,
    quarter,
    periodDate: `2025-0${quarter * 3}-30`,
    income: {
      revenue,
      grossProfit,
      operatingIncome,
      netIncome,
      eps,
    },
    balanceSheet: {
      totalAssets,
      totalLiabilities: totalAssets - totalEquity,
      totalEquity,
      accountsReceivable: 100000,
      inventory: 150000,
      cashAndEquivalents: 300000,
    },
    cashFlow: {
      operatingCashFlow: netIncome * 1.2,
      capitalExpenditure: 50000,
    },
    updatedAt: Date.now(),
  });

  describe('1. 獲利三率計算與零除防禦', () => {
    it('應能正確計算毛利率、營業利益率與稅後淨利率', () => {
      const record = createMockRecord(1, 1000000, 530000, 420000, 360000);
      const metrics = calculateProfitabilityMetrics([record]);

      expect(metrics.grossMargin).toBe(53);
      expect(metrics.operatingMargin).toBe(42);
      expect(metrics.netMargin).toBe(36);
      expect(metrics.roe).toBe(72); // (360000 / 500000) * 100
    });

    it('零除防禦：當營收為 0 或負數時，應回傳安全 0 值，絕不噴出 NaN%', () => {
      const zeroRevRecord = createMockRecord(1, 0, 0, -20000, -20000);
      const metrics = calculateProfitabilityMetrics([zeroRevRecord]);

      expect(metrics.grossMargin).toBe(0);
      expect(metrics.operatingMargin).toBe(0);
      expect(metrics.netMargin).toBe(0);
      expect(Number.isNaN(metrics.grossMargin)).toBe(false);
    });
  });

  describe('2. 三率走勢研判 (analyzeMarginTrend)', () => {
    it('當毛利率連續擴張時，應判定為 EXPANDING', () => {
      const r1 = createMockRecord(1, 1000, 400, 200, 150); // 40%
      const r2 = createMockRecord(2, 1100, 484, 250, 180); // 44%
      const r3 = createMockRecord(3, 1200, 600, 320, 240); // 50%

      expect(analyzeMarginTrend([r3, r2, r1])).toBe('EXPANDING');
    });

    it('當毛利率連續萎縮時，應判定為 CONTRACTING', () => {
      const r1 = createMockRecord(1, 1000, 500, 250, 200); // 50%
      const r2 = createMockRecord(2, 1100, 495, 230, 170); // 45%
      const r3 = createMockRecord(3, 1200, 480, 200, 150); // 40%

      expect(analyzeMarginTrend([r3, r2, r1])).toBe('CONTRACTING');
    });
  });

  describe('3. 杜邦三因子拆解 (calculateDuPontAnalysis)', () => {
    it('應能正確拆解 ROE = 淨利率 × 資產週轉率 × 權益乘數', () => {
      // 淨利 20萬, 營收 100萬, 總資產 200萬, 股東權益 100萬
      // 淨利率 = 20%, 週轉率 = 0.5, 權益乘數 = 2.0 -> ROE = 20%
      const record = createMockRecord(1, 1000000, 400000, 250000, 200000, 2000000, 1000000);
      const duPont = calculateDuPontAnalysis(record);

      expect(duPont.roe).toBeCloseTo(20, 1);
      expect(duPont.netMargin).toBeCloseTo(20, 1);
      expect(duPont.assetTurnover).toBeCloseTo(0.5, 2);
      expect(duPont.equityMultiplier).toBeCloseTo(2, 2);
    });

    it('當槓桿乘數大於 4 且淨利率低時，應將主驅動力標記為 LEVERAGE (高槓桿虛胖)', () => {
      // 淨利 2萬, 營收 100萬, 總資產 1000萬, 股東權益 100萬 (乘數 10倍)
      const highLeverageRecord = createMockRecord(1, 1000000, 100000, 30000, 20000, 10000000, 1000000);
      const duPont = calculateDuPontAnalysis(highLeverageRecord);

      expect(duPont.equityMultiplier).toBe(10);
      expect(duPont.primaryDriver).toBe('LEVERAGE');
    });

    it('零除防禦：當總資產或權益為 0 時，回傳安全預設結構', () => {
      const edgeRecord = createMockRecord(1, 100000, 30000, 20000, 10000, 0, 0);
      const duPont = calculateDuPontAnalysis(edgeRecord);

      expect(duPont.roe).toBe(0);
      expect(duPont.assetTurnover).toBe(0);
      expect(duPont.equityMultiplier).toBe(1);
    });
  });

  describe('4. Ticket 06 & 07: 本業獲利純度、營運槓桿係數 (DOL) 與成長加速度', () => {
    it('應能正確計算本業獲利純度比率 (營業利益 / 稅前淨利或淨利)', () => {
      // 本業營業利益 400000，淨利 360000 (代表本業純度極高 > 100%)
      const r1 = createMockRecord(1, 1000000, 500000, 400000, 360000);
      const purity1 = calculateCoreBusinessPurity(r1);
      expect(purity1.purityRatio).toBeCloseTo(111.11, 1);
      expect(purity1.isHighQuality).toBe(true);

      // 本業營業利益 100000，但靠業外大賺使淨利達 500000 (業外佔 80%，本業純度低)
      const r2 = createMockRecord(2, 1000000, 300000, 100000, 500000);
      const purity2 = calculateCoreBusinessPurity(r2);
      expect(purity2.purityRatio).toBeCloseTo(20.0, 1);
      expect(purity2.isHighQuality).toBe(false);
      expect(purity2.warning).toContain('業外');
    });

    it('應能正確計算營運槓桿係數 (DOL) 與營收成長加速度 (二階導數)', () => {
      const records = [
        createMockRecord(4, 1200000, 600000, 480000, 400000), // 當季
        createMockRecord(3, 1100000, 550000, 420000, 350000), // 上季
        createMockRecord(2, 1000000, 500000, 380000, 320000),
        createMockRecord(1, 900000, 450000, 340000, 280000),
        // 去年同期 (YoY 基期)
        { ...createMockRecord(4, 1000000, 500000, 360000, 300000), year: 2024 },
        { ...createMockRecord(3, 900000, 450000, 320000, 260000), year: 2024 },
      ];

      const leverage = calculateOperatingLeverage(records);
      // 營收 YoY = (1200000 - 1000000) / 1000000 = +20%
      // 營業利益 YoY = (480000 - 360000) / 360000 = +33.33%
      // DOL = 33.33 / 20 = 1.67 (營運槓桿放大獲利)
      expect(leverage.revenueYoY).toBeCloseTo(20.0, 1);
      expect(leverage.operatingIncomeYoY).toBeCloseTo(33.33, 1);
      expect(leverage.degreeOfOperatingLeverage).toBeCloseTo(1.67, 1);
      expect(leverage.isExpanding).toBe(true);
    });
  });
});
