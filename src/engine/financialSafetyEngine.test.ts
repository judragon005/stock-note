import { describe, it, expect } from 'vitest';
import {
  calculateSafetyMetrics,
  calculateNetCashPosition,
  evaluateSolvencyRisk,
} from './financialSafetyEngine';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Financial Safety & Net Cash Engine (TDD Seam)', () => {
  const createMockSafetyRecord = (
    totalAssets: number,
    totalLiabilities: number,
    cashAndEquivalents: number,
    accountsReceivable: number,
    inventory: number,
    shortTermDebt?: number,
    longTermDebt?: number
  ): QuarterlyFinancialRecord => ({
    symbol: '2330',
    market: 'TW',
    year: 2025,
    quarter: 2,
    periodDate: '2025-06-30',
    income: {
      revenue: 500000,
      grossProfit: 250000,
      operatingIncome: 200000,
      netIncome: 180000,
      eps: 7.0,
    },
    balanceSheet: {
      totalAssets,
      totalLiabilities,
      totalEquity: totalAssets - totalLiabilities,
      accountsReceivable,
      inventory,
      cashAndEquivalents,
      shortTermDebt,
      longTermDebt,
    },
    cashFlow: {
      operatingCashFlow: 200000,
      capitalExpenditure: 80000,
    },
    updatedAt: Date.now(),
  });

  describe('1. 負債比率與速動比率計算', () => {
    it('應能正確計算負債比率與速動比率', () => {
      // 總資產 100萬, 負債 40萬 (負債比 40%)
      // 現金 30萬, 應收 20萬, 存貨 25萬 (速動資產 = 50萬 -> 速動比率 50/40 = 125%)
      const record = createMockSafetyRecord(1000000, 400000, 300000, 200000, 250000);
      const metrics = calculateSafetyMetrics(record);

      expect(metrics.debtRatio).toBe(40);
      expect(metrics.quickRatio).toBe(125);
    });

    it('零除防禦：當總資產或負債為 0 時，不發生除以零例外', () => {
      const zeroDebtRecord = createMockSafetyRecord(1000000, 0, 500000, 100000, 100000);
      const metrics = calculateSafetyMetrics(zeroDebtRecord);

      expect(metrics.debtRatio).toBe(0);
      expect(metrics.quickRatio).toBe(999); // 零負債時速動比封頂安全值
    });
  });

  describe('2. 真實淨現金水位 (Net Cash = 現金 - 有息負債)', () => {
    it('當現金大於有息借款時，應判定 isNetCashPositive = true', () => {
      // 現金 50萬, 短期借款 10萬, 長期負債 20萬 -> 淨現金 20萬
      const record = createMockSafetyRecord(1000000, 400000, 500000, 100000, 100000, 100000, 200000);
      const netCash = calculateNetCashPosition(record);

      expect(netCash.netCash).toBe(200000);
      expect(netCash.isNetCashPositive).toBe(true);
    });

    it('當現金小於有息借款時，應判定 isNetCashPositive = false', () => {
      // 現金 10萬, 短借 30萬, 長債 50萬 -> 淨現金 -70萬
      const record = createMockSafetyRecord(1000000, 850000, 100000, 50000, 400000, 300000, 500000);
      const netCash = calculateNetCashPosition(record);

      expect(netCash.netCash).toBe(-700000);
      expect(netCash.isNetCashPositive).toBe(false);
    });

    it('若無拆解有息負債，應以 (現金及約當現金 - 總負債) 作為保守估計', () => {
      const record = createMockSafetyRecord(1000000, 300000, 400000, 100000, 100000); // 未給 shortTermDebt
      const netCash = calculateNetCashPosition(record);

      expect(netCash.netCash).toBe(100000); // 400000 - 300000
    });
  });

  describe('3. 破解虛假流動比率 (evaluateSolvencyRisk)', () => {
    it('當資產中存貨超過 50% 且速動比率小於 100% 時，應標註虛假流動性風險', () => {
      // 總負債 50萬, 現金 10萬, 應收 10萬, 存貨 60萬 (存貨佔比高達 75%)
      // 速動資產 = 20萬, 速動比率 = 40% < 100%
      const riskyRecord = createMockSafetyRecord(1000000, 500000, 100000, 100000, 600000);
      const risk = evaluateSolvencyRisk(riskyRecord);

      expect(risk.hasLiquidityTrap).toBe(true);
      expect(risk.warning).toContain('存貨佔比過高');
    });

    it('體質優異企業不應被標記流動性風險', () => {
      const safeRecord = createMockSafetyRecord(1000000, 200000, 400000, 200000, 100000, 50000, 50000);
      const risk = evaluateSolvencyRisk(safeRecord);

      expect(risk.hasLiquidityTrap).toBe(false);
    });
  });
});
