import { describe, it, expect } from 'vitest';
import {
  simulateDRIPCompounding,
  calculatePassiveIncomeMilestones,
} from './dripCompoundingEngine';
import { DRIPSimulationConfig } from '../types/firePlanning';

describe('dripCompoundingEngine (DRIP 複利滾雪球與里程碑引擎)', () => {
  const baseConfig: DRIPSimulationConfig = {
    initialPortfolioValue: 1_000_000,     // 100 萬台幣
    weightedDividendYield: 0.05,          // 5% 殖利率
    expectedCapitalGrowthRate: 0.05,      // 5% 股價增值率
    dividendGrowthRate: 0.03,             // 3% 股息成長率
    monthlyContributionTwd: 10_000,       // 每月定投 1 萬 (年投 12 萬)
    reinvestTaxRate: 0.0211,              // 二代健保 2.11%
    yearsToProject: 20,
    customMonthlyExpenseTarget: 50_000,   // 自訂月支出 5 萬
  };

  describe('simulateDRIPCompounding (雙軌對比模擬)', () => {
    it('應正確產生第 0 年至第 N 年的時序資料點', () => {
      const results = simulateDRIPCompounding(baseConfig);
      expect(results.length).toBe(21); // 0..20 共 21 年
      
      const year0 = results[0];
      expect(year0.year).toBe(0);
      expect(year0.cashOutPortfolioValue).toBe(1_000_000);
      expect(year0.dripPortfolioValue).toBe(1_000_000);
      expect(year0.compoundingMultiplier).toBe(1.0);
      expect(year0.dripSharesMultiplier).toBe(1.0);
      expect(year0.wealthDeltaTwd).toBe(0);
    });

    it('DRIP 模式之總市值在未來年度應顯著超越 Cash Out 模式 (複利滾雪球)', () => {
      const results = simulateDRIPCompounding(baseConfig);
      const year10 = results[10];
      const year20 = results[20];

      // 第 10 年
      expect(year10.dripPortfolioValue).toBeGreaterThan(year10.cashOutPortfolioValue);
      expect(year10.compoundingMultiplier).toBeGreaterThan(1.1); // 至少多 10% 以上
      expect(year10.wealthDeltaTwd).toBe(year10.dripPortfolioValue - year10.cashOutPortfolioValue);

      // 第 20 年複利差距應進一步急劇擴大
      expect(year20.compoundingMultiplier).toBeGreaterThan(year10.compoundingMultiplier);
      expect(year20.dripAnnualDividendNet).toBeGreaterThan(year20.cashOutAnnualDividendNet);
      expect(year20.dripSharesMultiplier).toBeGreaterThan(1.5); // 股份因再投資大幅擴充
    });

    it('極端邊界測試：若殖利率為 0，DRIP 應等同於 Cash Out 模式', () => {
      const zeroYieldConfig: DRIPSimulationConfig = {
        ...baseConfig,
        weightedDividendYield: 0,
        monthlyContributionTwd: 0,
      };
      const results = simulateDRIPCompounding(zeroYieldConfig);
      const year10 = results[10];
      expect(year10.compoundingMultiplier).toBe(1.0);
      expect(year10.dripPortfolioValue).toBe(year10.cashOutPortfolioValue);
      expect(year10.wealthDeltaTwd).toBe(0);
    });

    it('極端邊界測試：若初始資產為 0 但有每月定投，系統能正常啟動滾雪球', () => {
      const zeroInitialConfig: DRIPSimulationConfig = {
        ...baseConfig,
        initialPortfolioValue: 0,
        monthlyContributionTwd: 20_000,
      };
      const results = simulateDRIPCompounding(zeroInitialConfig);
      expect(results[0].dripPortfolioValue).toBe(0);
      expect(results[1].dripPortfolioValue).toBeGreaterThan(0);
      expect(results[10].dripPortfolioValue).toBeGreaterThan(results[10].cashOutPortfolioValue);
    });
  });

  describe('calculatePassiveIncomeMilestones (4 階被動收入自由度里程碑與連續插值)', () => {
    it('應回傳 4 大階梯加上自訂目標之里程碑清單', () => {
      const projection = simulateDRIPCompounding(baseConfig);
      const milestones = calculatePassiveIncomeMilestones(projection, baseConfig.customMonthlyExpenseTarget);

      expect(milestones.length).toBe(5); // Tier 1, 2, 3, 4 + Custom
      expect(milestones.map((m) => m.tierId)).toContain('TIER_1_UTILITY');
      expect(milestones.map((m) => m.tierId)).toContain('TIER_2_BASIC');
      expect(milestones.map((m) => m.tierId)).toContain('TIER_3_COMFORT');
      expect(milestones.map((m) => m.tierId)).toContain('TIER_4_FIRE');
      expect(milestones.map((m) => m.tierId)).toContain('TIER_CUSTOM');
    });

    it('DRIP 模式達成里程碑的年份應小於或等於 Cash Out 模式 (提供 yearsSaved)', () => {
      const projection = simulateDRIPCompounding(baseConfig);
      const milestones = calculatePassiveIncomeMilestones(projection, baseConfig.customMonthlyExpenseTarget);

      const tier2 = milestones.find((m) => m.tierId === 'TIER_2_BASIC')!;
      expect(tier2.monthlyTargetTwd).toBe(30_000);
      
      if (tier2.achievedYearDRIP !== null && tier2.achievedYearCashOut !== null) {
        expect(tier2.achievedYearDRIP).toBeLessThanOrEqual(tier2.achievedYearCashOut);
        expect(tier2.yearsSaved).toBeGreaterThanOrEqual(0);
        // 連續線性插值應具備浮點數精度 (例如 8.4 年而非整數)
        expect(Number.isFinite(tier2.achievedYearDRIP)).toBe(true);
      }
    });

    it('當目標過高在 20 年內無法達成時，應安全回傳 null 與 yearsSaved: null', () => {
      const projection = simulateDRIPCompounding(baseConfig);
      // 設定月目標 500 萬
      const milestones = calculatePassiveIncomeMilestones(projection, 5_000_000);
      const customTier = milestones.find((m) => m.tierId === 'TIER_CUSTOM')!;
      expect(customTier.achievedYearDRIP).toBeNull();
      expect(customTier.achievedYearCashOut).toBeNull();
      expect(customTier.yearsSaved).toBeNull();
      expect(customTier.isCurrentlyAchieved).toBe(false);
    });

    it('當第 0 年月股息已經超過目標時，應標記 isCurrentlyAchieved: true 且 achievedYear 為 0', () => {
      const richConfig: DRIPSimulationConfig = {
        ...baseConfig,
        initialPortfolioValue: 50_000_000, // 5,000 萬本金，5% 年息約 250 萬，月息 > 20 萬
      };
      const projection = simulateDRIPCompounding(richConfig);
      const milestones = calculatePassiveIncomeMilestones(projection, 30_000);
      const tier1 = milestones.find((m) => m.tierId === 'TIER_1_UTILITY')!;
      expect(tier1.isCurrentlyAchieved).toBe(true);
      expect(tier1.achievedYearDRIP).toBe(0);
      expect(tier1.achievedYearCashOut).toBe(0);
      expect(tier1.yearsSaved).toBe(0);
    });
  });
});
