import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioMacroShield,
  calculateUpcomingCatalysts,
  generateAiMorningBrief,
  buildLlmPromptPayload,
} from './macroAdvisorEngine';
import {
  MacroIndicatorSnapshot,
  MacroPortfolioShield,
  UpcomingCatalyst,
} from '../types/macro';

describe('MacroAdvisorEngine (TDD Seam)', () => {
  const createBaseMacro = (
    overrides?: Partial<MacroIndicatorSnapshot>
  ): MacroIndicatorSnapshot => ({
    date: '2026-09-08',
    us10y: 3.85,
    us2y: 3.95,
    yieldSpread: -0.1,
    isYieldInverted: true,
    vix: 18.5,
    vixLevel: 'NORMAL',
    fearAndGreedIndex: 50,
    fearAndGreedLevel: 'NEUTRAL',
    goldPrice: 2500,
    oilPrice: 75,
    dxy: 101.5,
    usdToTwd: 32.0,
    usM2GrowthYoY: 2.1,
    twM2GrowthYoY: 5.5,
    updatedAt: Date.now(),
    ...overrides,
  });

  const createBaseShield = (
    overrides?: Partial<MacroPortfolioShield>
  ): MacroPortfolioShield => ({
    totalNavTWD: 2000000,
    cashBalanceTWD: 400000,
    cashRatioPercent: 20,
    cashStatus: 'ADEQUATE',
    hasLoans: false,
    marginMaintenanceRatio: 0,
    marginStatus: 'NO_LOAN',
    maxAllocationDriftPercent: 2.5,
    portfolioBeta: 0.95,
    ...overrides,
  });

  describe('1. 個人防護盾試算 (calculatePortfolioMacroShield)', () => {
    it('應精確判斷現金水位等級 (緊繃/適中/充裕)', () => {
      // 現金 5% => TIGHT
      const shieldTight = calculatePortfolioMacroShield({
        navTWD: 1000000,
        cashTWD: 50000,
        totalLoanDebtTWD: 0,
        collateralValueTWD: 0,
        maxDriftPercent: 2.0,
      });
      expect(shieldTight.cashRatioPercent).toBe(5);
      expect(shieldTight.cashStatus).toBe('TIGHT');
      expect(shieldTight.marginStatus).toBe('NO_LOAN');

      // 現金 25% => ADEQUATE
      const shieldAdequate = calculatePortfolioMacroShield({
        navTWD: 1000000,
        cashTWD: 250000,
        totalLoanDebtTWD: 0,
        collateralValueTWD: 0,
        maxDriftPercent: 2.0,
      });
      expect(shieldAdequate.cashStatus).toBe('ADEQUATE');

      // 現金 35% => STRONG
      const shieldStrong = calculatePortfolioMacroShield({
        navTWD: 1000000,
        cashTWD: 350000,
        totalLoanDebtTWD: 0,
        collateralValueTWD: 0,
        maxDriftPercent: 2.0,
      });
      expect(shieldStrong.cashStatus).toBe('STRONG');
    });

    it('應精確判斷借貸質押維持率等級', () => {
      // 借款 500,000，擔保品 700,000 => 維持率 140% => WARNING
      const shieldWarning = calculatePortfolioMacroShield({
        navTWD: 1000000,
        cashTWD: 200000,
        totalLoanDebtTWD: 500000,
        collateralValueTWD: 700000,
        maxDriftPercent: 1.5,
      });
      expect(shieldWarning.hasLoans).toBe(true);
      expect(shieldWarning.marginMaintenanceRatio).toBe(140);
      expect(shieldWarning.marginStatus).toBe('WARNING');

      // 擔保品 1,200,000 => 維持率 240% => SAFE
      const shieldSafe = calculatePortfolioMacroShield({
        navTWD: 1000000,
        cashTWD: 200000,
        totalLoanDebtTWD: 500000,
        collateralValueTWD: 1200000,
        maxDriftPercent: 1.5,
      });
      expect(shieldSafe.marginMaintenanceRatio).toBe(240);
      expect(shieldSafe.marginStatus).toBe('SAFE');
    });
  });

  describe('2. 關鍵財經事件倒數計算 (calculateUpcomingCatalysts)', () => {
    it('應根據基準日正確計算未來事件倒數天數，並排除已過期事件', () => {
      const mockRawCatalysts = [
        {
          id: 'cpi-aug',
          name: '美國 8 月 CPI 公布',
          date: '2026-09-11',
          category: 'INFLATION' as const,
          description: '觀察通膨降溫趨勢',
        },
        {
          id: 'fomc-sep',
          name: 'FOMC 利率決議',
          date: '2026-09-18',
          category: 'CENTRAL_BANK' as const,
          description: '聯準會利率會議',
        },
        {
          id: 'old-event',
          name: '上週非農就業',
          date: '2026-09-01',
          category: 'EMPLOYMENT' as const,
          description: '已過期事件',
        },
      ];

      const upcoming = calculateUpcomingCatalysts(mockRawCatalysts, '2026-09-08');
      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].id).toBe('cpi-aug');
      expect(upcoming[0].daysLeft).toBe(3);
      expect(upcoming[1].id).toBe('fomc-sep');
      expect(upcoming[1].daysLeft).toBe(10);
    });
  });

  describe('3. 離線確定性 AI 作戰方針生成 (generateAiMorningBrief)', () => {
    it('情境 1：極度恐慌 + 現金充裕 + 槓桿安全 => 【防禦蓄勢・分批低接】', () => {
      const macro = createBaseMacro({
        vix: 33.5,
        vixLevel: 'PANIC',
        fearAndGreedIndex: 18,
        fearAndGreedLevel: 'EXTREME_FEAR',
      });
      const shield = createBaseShield({
        cashRatioPercent: 32,
        cashStatus: 'STRONG',
        hasLoans: true,
        marginMaintenanceRatio: 260,
        marginStatus: 'SAFE',
      });

      const brief = generateAiMorningBrief({ macro, shield, asOfDate: '2026-09-08' });

      expect(brief.headline).toContain('【防禦蓄勢・分批低接】');
      expect(brief.tone).toBe('OPPORTUNISTIC');
      expect(brief.actionPoints.length).toBeGreaterThanOrEqual(3);
      expect(brief.macroDiagnosis).toContain('恐慌');
      expect(brief.shieldDiagnosis).toContain('充裕');
    });

    it('情境 2：極度恐慌 + 現金告急 + 質押警戒 => 【極端避險・嚴守防線】', () => {
      const macro = createBaseMacro({
        vix: 36.0,
        vixLevel: 'PANIC',
        fearAndGreedIndex: 12,
        fearAndGreedLevel: 'EXTREME_FEAR',
      });
      const shield = createBaseShield({
        cashRatioPercent: 4,
        cashStatus: 'TIGHT',
        hasLoans: true,
        marginMaintenanceRatio: 135,
        marginStatus: 'WARNING',
      });

      const brief = generateAiMorningBrief({ macro, shield, asOfDate: '2026-09-08' });

      expect(brief.headline).toContain('【極端避險・嚴守防線】');
      expect(brief.tone).toBe('DEFENSIVE');
      expect(brief.summary).toContain('保全本金');
      // 行動要點應明確提醒質押補款或嚴禁追高殺低
      const hasMarginWarning = brief.actionPoints.some(
        (p) => p.includes('維持率') || p.includes('警戒') || p.includes('償還') || p.includes('防守')
      );
      expect(hasMarginWarning).toBe(true);
    });

    it('情境 3：市場過熱亢奮 + 偏離度過大 => 【獲利調節・拉高現金】', () => {
      const macro = createBaseMacro({
        vix: 12.0,
        vixLevel: 'EUPHORIA',
        fearAndGreedIndex: 82,
        fearAndGreedLevel: 'EXTREME_GREED',
      });
      const shield = createBaseShield({
        maxAllocationDriftPercent: 7.5,
        cashRatioPercent: 12,
        cashStatus: 'ADEQUATE',
      });

      const brief = generateAiMorningBrief({ macro, shield, asOfDate: '2026-09-08' });

      expect(brief.headline).toContain('【獲利調節・拉高現金】');
      expect(brief.tone).toBe('CAUTION');
      expect(brief.actionPoints.some((p) => p.includes('再平衡') || p.includes('調節'))).toBe(
        true
      );
    });

    it('情境 4：常態平穩行情 => 【安全巡航・維持紀律】', () => {
      const macro = createBaseMacro({
        vix: 18.0,
        vixLevel: 'NORMAL',
        fearAndGreedIndex: 52,
        fearAndGreedLevel: 'NEUTRAL',
      });
      const shield = createBaseShield({
        cashRatioPercent: 20,
        cashStatus: 'ADEQUATE',
        maxAllocationDriftPercent: 1.5,
      });

      const brief = generateAiMorningBrief({ macro, shield, asOfDate: '2026-09-08' });

      expect(brief.headline).toContain('【安全巡航・維持紀律】');
      expect(brief.tone).toBe('NEUTRAL');
      expect(brief.actionPoints.some((p) => p.includes('紀律') || p.includes('常規'))).toBe(
        true
      );
    });
  });

  describe('4. LLM Payload 結構化合規檢驗 (buildLlmPromptPayload)', () => {
    it('輸出的 JSON 字串應結構完整且可被成功解析', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield();
      const catalysts: UpcomingCatalyst[] = [
        {
          id: 'fomc',
          name: 'FOMC Meeting',
          date: '2026-09-18',
          daysLeft: 10,
          category: 'CENTRAL_BANK',
          description: '利率決議',
        },
      ];

      const jsonStr = buildLlmPromptPayload(macro, shield, catalysts);
      expect(typeof jsonStr).toBe('string');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.macro.vix).toBe(18.5);
      expect(parsed.portfolio.cashRatioPercent).toBe(20);
      expect(parsed.upcomingEvents).toHaveLength(1);
      expect(parsed.upcomingEvents[0].daysLeft).toBe(10);
    });
  });
});
