import { describe, it, expect } from 'vitest';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import {
  calculatePiotroskiFScore,
  calculateFcfYield,
  calculatePeterLynchValuation,
  calculateDcfValuation,
  calculateDdmValuation,
  deriveSharesOutstanding,
} from './keyMetricsEngine';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function createMockQuarter(
  year: number,
  quarter: number,
  overrides?: DeepPartial<QuarterlyFinancialRecord>
): QuarterlyFinancialRecord {
  return {
    symbol: 'TEST',
    market: 'TW',
    year,
    quarter,
    periodDate: `${year}-${String(quarter * 3).padStart(2, '0')}-30`,
    income: {
      revenue: overrides?.income?.revenue ?? 100000000,
      grossProfit: overrides?.income?.grossProfit ?? 40000000,
      operatingIncome: overrides?.income?.operatingIncome ?? 20000000,
      netIncome: overrides?.income?.netIncome ?? 15000000,
      eps: overrides?.income?.eps ?? 1.5,
    },
    balanceSheet: {
      totalAssets: overrides?.balanceSheet?.totalAssets ?? 500000000,
      totalLiabilities: overrides?.balanceSheet?.totalLiabilities ?? 200000000,
      totalEquity: overrides?.balanceSheet?.totalEquity ?? 300000000,
      accountsReceivable: overrides?.balanceSheet?.accountsReceivable ?? 20000000,
      inventory: overrides?.balanceSheet?.inventory ?? 15000000,
      cashAndEquivalents: overrides?.balanceSheet?.cashAndEquivalents ?? 80000000,
      capitalStock: overrides?.balanceSheet?.capitalStock,
    },
    cashFlow: {
      operatingCashFlow: overrides?.cashFlow?.operatingCashFlow ?? 18000000,
      capitalExpenditure: overrides?.cashFlow?.capitalExpenditure ?? 5000000,
      dividendPaid: overrides?.cashFlow?.dividendPaid ?? 10000000,
    },
    updatedAt: Date.now(),
  };
}

describe('keyMetricsEngine (量化估值與關鍵指標計算引擎 TDD)', () => {
  describe('Piotroski F-Score (9 分制量化評分卡)', () => {
    it('健康優質企業應獲得高分 (8 ~ 9 分)', () => {
      // 提供 8 季財報 (涵蓋當季與去年同期)
      const records: QuarterlyFinancialRecord[] = [];
      for (let y = 2024; y <= 2025; y++) {
        for (let q = 1; q <= 4; q++) {
          records.push(
            createMockQuarter(y, q, {
              income: {
                revenue: 100000000 * (y === 2025 ? 1.2 : 1.0),
                grossProfit: 45000000 * (y === 2025 ? 1.25 : 1.0),
                operatingIncome: 25000000,
                netIncome: 20000000,
                eps: 2.0,
              },
              cashFlow: {
                operatingCashFlow: 25000000, // CFO > NetIncome
                capitalExpenditure: 5000000,
              },
            })
          );
        }
      }

      const res = calculatePiotroskiFScore(records);
      expect(res.totalScore).toBeGreaterThanOrEqual(7);
      expect(res.details.f_roa.passed).toBe(true);
      expect(res.details.f_cfo.passed).toBe(true);
      expect(res.details.f_accrual.passed).toBe(true);
      expect(res.rating).toBe('EXCELLENT');
    });

    it('嚴重虧損且現金流惡化之公司應獲得低分 (0 ~ 2 分)', () => {
      const records: QuarterlyFinancialRecord[] = [
        createMockQuarter(2024, 4),
        createMockQuarter(2025, 4, {
          income: {
            revenue: 50000000,
            grossProfit: 5000000,
            operatingIncome: -10000000,
            netIncome: -15000000, // 虧損
            eps: -1.5,
          },
          cashFlow: {
            operatingCashFlow: -8000000, // CFO 負值
            capitalExpenditure: 2000000,
          },
        }),
      ];

      const res = calculatePiotroskiFScore(records);
      expect(res.totalScore).toBeLessThanOrEqual(3);
      expect(res.details.f_roa.passed).toBe(false);
      expect(res.details.f_cfo.passed).toBe(false);
      expect(res.rating).toBe('WEAK');
    });
  });

  describe('自由現金流報酬率 (FCF Yield)', () => {
    it('FCF 為正且股價合理時應正確計算收益率百分比', () => {
      const record = createMockQuarter(2025, 4, {
        income: { netIncome: 10000000, eps: 2.0 },
        cashFlow: { operatingCashFlow: 20000000, capitalExpenditure: 5000000 },
      });
      // FCF = 15,000,000, 假設發行股數 5,000,000 股 => 每股 FCF = 3 元, 股價 50 元 => FCF Yield = 6%
      const yieldPct = calculateFcfYield(record, 50, 5000000);
      expect(yieldPct).toBeCloseTo(6.0, 1);
    });
  });

  describe('彼得林區評價 (Peter Lynch Fair Value & PEG)', () => {
    it('成長型企業之合理價值與 PEG 應準確推算', () => {
      const records = [
        createMockQuarter(2024, 4, { income: { eps: 4.0 } }),
        createMockQuarter(2025, 4, { income: { eps: 5.0 } }), // YoY = 25%
      ];
      // TTM EPS = 5.0, G = 25%, Fair Value = 5 * 25 = 125 元
      // 當前股價 100 元, PE = 100 / 5 = 20, PEG = 20 / 25 = 0.8 (< 1.0 低估)
      const res = calculatePeterLynchValuation(records, 100);
      expect(res.fairValue).toBe(125);
      expect(res.pegRatio).toBeCloseTo(0.8, 1);
      expect(res.assessment).toBe('UNDERVALUED');
    });
  });

  describe('現金流折現評價 (DCF Model with Sliders)', () => {
    it('應支援自訂 WACC 與永續成長率，計算每股內在價值', () => {
      const records = [
        createMockQuarter(2025, 1, { cashFlow: { operatingCashFlow: 30000000, capitalExpenditure: 10000000 } }),
        createMockQuarter(2025, 2, { cashFlow: { operatingCashFlow: 30000000, capitalExpenditure: 10000000 } }),
        createMockQuarter(2025, 3, { cashFlow: { operatingCashFlow: 30000000, capitalExpenditure: 10000000 } }),
        createMockQuarter(2025, 4, { cashFlow: { operatingCashFlow: 30000000, capitalExpenditure: 10000000 } }),
      ];
      // TTM FCF = 80,000,000 元
      const res = calculateDcfValuation(records, 100, {
        waccRate: 0.09,
        perpetualGrowthRate: 0.025,
        totalShares: 10000000, // 1000萬股 => 每股 FCF 8 元
      });
      expect(res.intrinsicValue).toBeGreaterThan(50);
      expect(res.discountRate).toBe(0.09);
      expect(res.marginOfSafetyPct).toBeDefined();
    });
  });

  describe('股利折現評價 (DDM Gordon Model)', () => {
    it('穩定配息股應正確推導戈登模型合理價', () => {
      const dividends = [
        { year: 2021, amount: 4.0 },
        { year: 2022, amount: 4.2 },
        { year: 2023, amount: 4.5 },
        { year: 2024, amount: 4.8 },
        { year: 2025, amount: 5.0 },
      ];
      // D = 5.0, g = 5%, r = 9% => Fair Value = 5 * 1.05 / (0.09 - 0.05) = 5.25 / 0.04 = 131.25 元
      const res = calculateDdmValuation(dividends, 100, 0.09, 0.05);
      expect(res.fairValue).toBeCloseTo(131.25, 1);
      expect(res.assessment).toBe('UNDERVALUED');
    });
  });

  describe('deriveSharesOutstanding (第一性原理流通股數推導純函式 - Spec 0139 / Ticket 02)', () => {
    it('1. 當傳入 overrideShares > 0 時，應優先採用自訂股數', () => {
      const res = deriveSharesOutstanding(undefined, 50000000);
      expect(res).toBe(50000000);
    });

    it('2. 當資產負債表具備資本額 capitalStock 時，應精確除以 10 (台股每股票面 10 元)', () => {
      const record = createMockQuarter(2025, 4, {
        balanceSheet: { capitalStock: 75311817420 }, // 753 億資本額 => 7,531,181,742 股
      });
      const res = deriveSharesOutstanding(record);
      expect(res).toBe(7531181742);
    });

    it('3. 當傳入多季陣列時，應優先採用最新一季推導', () => {
      const records = [
        createMockQuarter(2025, 2, { balanceSheet: { capitalStock: 200000000 } }),
        createMockQuarter(2025, 1, { balanceSheet: { capitalStock: 100000000 } }),
      ];
      const res = deriveSharesOutstanding(records);
      expect(res).toBe(20000000); // 2 億 / 10 = 2000 萬股
    });

    it('4. 當無資本額但具備稅後淨利與正數 EPS 時，應由 netIncome / eps 反推股數', () => {
      const record = createMockQuarter(2025, 4, {
        balanceSheet: { capitalStock: 0 },
        income: { netIncome: 30000000, eps: 3.0 },
      });
      const res = deriveSharesOutstanding(record);
      expect(res).toBe(10000000); // 3000 萬 / 3.0 = 1000 萬股
    });

    it('5. 當財務資料皆缺乏時，應安全回傳保底預設值 10 億股', () => {
      expect(deriveSharesOutstanding(undefined)).toBe(1000000000);
      expect(deriveSharesOutstanding([])).toBe(1000000000);
      const emptyRecord = createMockQuarter(2025, 4, {
        balanceSheet: { capitalStock: 0 },
        income: { netIncome: 0, eps: 0 },
      });
      expect(deriveSharesOutstanding(emptyRecord)).toBe(1000000000);
    });
  });
});
