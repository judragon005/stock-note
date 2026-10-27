import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioMacroShield,
  calculateUpcomingCatalysts,
  generateAiMorningBrief,
  buildLlmPromptPayload,
  calculateMacroThermometer,
  evaluateCreditRisk,
  evaluateTwMarketRisk,
  calculate1DayVaR95,
  calculateFxDelta,
  calculateQuickStressMatrix,
  groupCatalystsByTimeline,
  generateMonthlyRevenueDeadlineCatalyst,
  estimateExDividendIndexImpactPoints,
} from './macroAdvisorEngine';




import {
  MacroIndicatorSnapshot,
  MacroPortfolioShield,
  UpcomingCatalyst,
  MacroHoldingSignalInput,
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
    creditSpreadOAS: 3.2,
    cdsInsuranceIndex: 65,
    twFuturesNetOi: -15000,
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
    valueAtRisk95TWD: 39682,
    varRatioPercent: 1.98,
    fxDeltaTWD: -50000,
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
      expect(upcoming[0].impact).toBe('MEDIUM'); // 預設降級
      expect(upcoming[0].targetMarket).toBe('ALL'); // 預設降級
      expect(upcoming[1].id).toBe('fomc-sep');
      expect(upcoming[1].daysLeft).toBe(10);
    });

    it('應正確透傳自訂 impact、targetMarket 與 isCustom 屬性', () => {
      const customCatalysts = [
        {
          id: 'futures-settle',
          name: '台指期結算',
          date: '2026-10-21',
          category: 'DERIVATIVE_SETTLEMENT' as const,
          impact: 'HIGH' as const,
          targetMarket: 'TW' as const,
          description: '月結算日波動劇烈',
        },
      ];

      const res = calculateUpcomingCatalysts(customCatalysts, '2026-10-17');
      expect(res).toHaveLength(1);
      expect(res[0].daysLeft).toBe(4);
      expect(res[0].impact).toBe('HIGH');
      expect(res[0].targetMarket).toBe('TW');
      expect(res[0].category).toBe('DERIVATIVE_SETTLEMENT');
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

    it('情境 5：持股破線事件驅動 => 動態點名持股代號、防守價與停損警示', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield();

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-09-08',
        holdingSignals: [
          { symbol: '2881', name: '富邦金', action: 'SELL', stopLossPrice: 85 },
        ],
      });

      expect(brief.headline).toContain('【破線警戒・汰弱留強】');
      expect(brief.tone).toBe('DEFENSIVE');
      expect(brief.summary).toContain('跌破箱底');
      expect(brief.actionPoints.some((p) => p.includes('2881') && p.includes('富邦金') && p.includes('$85'))).toBe(true);
    });

    it('情境 5.1 (Ticket 03)：多檔破線標的必須獨立標註防守價，絕不可跨標的共用第一檔價格 (根除幽靈防守價 Bug)', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield();

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-10-27',
        holdingSignals: [
          { symbol: '3260', name: '威剛', action: 'SELL', stopLossPrice: 122.5, weightPercent: 5.2 },
          { symbol: '2344', name: '華邦電', action: 'SELL', stopLossPrice: 24.8, weightPercent: 4.1 },
          { symbol: '8105', name: '凌巨', action: 'SELL', stopLossPrice: 10.95, weightPercent: 1.5 },
        ],
      });

      const sellPoint = brief.actionPoints.find((p) => p.includes('破線'));
      expect(sellPoint).toBeDefined();
      // 驗證 3260 帶自身防守價 122.5，絕非 10.95
      expect(sellPoint).toContain('3260');
      expect(sellPoint).toContain('122.5');
      // 驗證 2344 帶自身防守價 24.8，絕非 10.95
      expect(sellPoint).toContain('2344');
      expect(sellPoint).toContain('24.8');
      // 驗證 8105 帶自身防守價 10.95
      expect(sellPoint).toContain('8105');
      expect(sellPoint).toContain('10.95');
      // 驗證絕不出現「(防守價 $10.95)」共用單一價格的字樣
      expect(sellPoint).not.toMatch(/已跌破三日箱底防守線 \(防守價 \$10\.95\)/);
    });

    it('情境 5.2 (Ticket 03)：多檔突破標的必須獨立標註各自移動防守點，00919 絕不可共用 0056 的 56.56 元 (根除幽靈共用價 Bug)', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield();

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-10-27',
        holdingSignals: [
          { symbol: '0056', name: '元大高股息', action: 'BUY', stopLossPrice: 56.56 },
          { symbol: '00919', name: '群益台灣精選高息', action: 'BUY', stopLossPrice: 32.2 },
        ],
      });

      const buyPoint = brief.actionPoints.find((p) => p.includes('動能突破'));
      expect(buyPoint).toBeDefined();
      expect(buyPoint).toContain('0056');
      expect(buyPoint).toContain('56.56');
      expect(buyPoint).toContain('00919');
      expect(buyPoint).toContain('32.2');
      // 絕不能出現整句只有單一「以 $56.56 作為第一道移動防守點」套給兩檔
      expect(buyPoint).not.toContain('持股 0056(元大高股息)、00919(群益台灣精選高息) 帶量站上箱頂主升段發動，以 $56.56 作為第一道移動防守點');
    });

    it('情境 5.3 (Ticket 05)：持股佔比超配時自動試算 45% 情境調倉需減碼之金額單 (Trade Blotter)', () => {
      const macro = createBaseMacro({ vix: 26, vixLevel: 'ELEVATED' });
      // 總淨值 10,000,000 元
      const shield = createBaseShield({ totalNavTWD: 10000000 });

      // 當前在倉股票總計 6,800,000 元 (68% 水位)
      const holdingSignals: MacroHoldingSignalInput[] = [
        { symbol: '2330', name: '台積電', action: 'HOLD', marketValueTWD: 4000000, weightPercent: 40 },
        { symbol: '0050', name: '元大台灣50', action: 'HOLD', marketValueTWD: 2000000, weightPercent: 20 },
        { symbol: '3260', name: '威剛', action: 'SELL', marketValueTWD: 800000, weightPercent: 8, stopLossPrice: 120 },
      ];

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-10-27',
        holdingSignals,
      });

      // 檢查是否包含具體情境調倉減碼金額
      const blotterPoint = brief.actionPoints.find((p) => p.includes('調倉') || p.includes('減碼') || p.includes('額度'));
      expect(blotterPoint).toBeDefined();
      expect(blotterPoint).toContain('68%');
      expect(blotterPoint).toContain('需降低股票額度');
    });

    it('情境 5.4 (Ticket 06)：質押維持率跌破 130% 時，明確標記 T+2 日 12:00 補回 166% 法規死線與補足金額', () => {
      const macro = createBaseMacro();
      // 質押維持率 125% 破 130% 斷頭線
      const shield = createBaseShield({
        hasLoans: true,
        marginMaintenanceRatio: 125,
        marginStatus: 'MARGIN_CALL',
      });

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-10-27',
      });

      const marginPoint = brief.actionPoints.find((p) => p.includes('T+2') || p.includes('166%') || p.includes('斷頭'));
      expect(marginPoint).toBeDefined();
      expect(marginPoint).toContain('T+2');
      expect(marginPoint).toContain('166%');
    });

    it('情境 6：持股突破 + 重大催化劑 + 股息入帳多因子複合驅動', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield();

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-09-08',
        holdingSignals: [
          { symbol: '2330', name: '台積電', action: 'BUY', stopLossPrice: 110 },
        ],
        catalysts: [
          { id: 'cpi', name: '美 8 月 CPI 數據', date: '2026-09-10', daysLeft: 2, category: 'INFLATION', description: '通膨數據' },
        ],
        upcomingDividends: [
          { symbol: '2330', amount: 15000, payDate: '2026-09-15', daysLeft: 7 },
        ],
      });

      expect(brief.headline).toContain('【強者恆強・突破進攻】');
      expect(brief.tone).toBe('OPPORTUNISTIC');
      // 驗證三項具體事件均被點名
      expect(brief.actionPoints.some((p) => p.includes('2330') && p.includes('動能突破'))).toBe(true);
      expect(brief.actionPoints.some((p) => p.includes('CPI') && p.includes('2 天'))).toBe(true);
      expect(brief.actionPoints.some((p) => p.includes('股息') && p.includes('15,000'))).toBe(true);
    });

    it('情境 6：高衝擊事件倒數 <= 3 天 + 質押維持率警戒 => 【重大事件逼近・嚴控質押槓桿】', () => {
      const macro = createBaseMacro();
      const shield = createBaseShield({
        hasLoans: true,
        marginMaintenanceRatio: 162,
        marginStatus: 'WARNING',
      });

      const brief = generateAiMorningBrief({
        macro,
        shield,
        asOfDate: '2026-10-17',
        catalysts: [
          {
            id: 'fomc-urgent',
            name: 'FOMC 利率決議',
            date: '2026-10-19',
            daysLeft: 2,
            category: 'CENTRAL_BANK',
            impact: 'HIGH',
            targetMarket: 'US',
            description: '決議即將公布',
          },
        ],
      });

      expect(brief.headline).toBe('【重大事件逼近・嚴控質押槓桿】');
      expect(brief.tone).toBe('CAUTION');
      expect(brief.actionPoints.some((p) => p.includes('槓桿警戒') && p.includes('FOMC'))).toBe(true);
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
      expect(parsed.macro.creditSpreadOAS).toBe(3.2);
      expect(parsed.macro.cdsInsuranceIndex).toBe(65);
      expect(parsed.macro.twFuturesNetOi).toBe(-15000);
      expect(parsed.portfolio.cashRatioPercent).toBe(20);
      expect(parsed.portfolio.valueAtRisk95TWD).toBeDefined();
      expect(parsed.systemDirective.role).toContain('CRO');
      expect(parsed.upcomingEvents).toHaveLength(1);
      expect(parsed.upcomingEvents[0].daysLeft).toBe(10);
    });
  });

  describe('5. 宏觀水溫計合成與股票倉位建議 (calculateMacroThermometer - Ticket 01)', () => {
    it('平穩繁榮環境應評定為進攻姿態 (AGGRESSIVE) 且倉位上限達 75% 以上', () => {
      const macro = createBaseMacro({
        yieldSpread: 0.8,
        isYieldInverted: false,
        vix: 13.5,
        vixLevel: 'NORMAL',
        fearAndGreedIndex: 68,
        fearAndGreedLevel: 'GREED',
        creditSpreadOAS: 3.1,
        cdsInsuranceIndex: 50,
        twFuturesNetOi: 5000,
        twMarginMaintenance: 172.5,
      });

      const thermo = calculateMacroThermometer(macro);
      expect(thermo.score).toBeGreaterThanOrEqual(70);
      expect(thermo.stance).toBe('AGGRESSIVE');
      expect(thermo.suggestedEquityAllocationPercent).toBeGreaterThanOrEqual(75);
      expect(thermo.rationale.length).toBeGreaterThan(0);
    });

    it('多重風暴環境（利差倒掛、VIX飆升、外資重度淨空單）應評定為防禦姿態 (DEFENSIVE)', () => {
      const macro = createBaseMacro({
        yieldSpread: -0.65,
        isYieldInverted: true,
        vix: 33.0,
        vixLevel: 'PANIC',
        fearAndGreedIndex: 18,
        fearAndGreedLevel: 'EXTREME_FEAR',
        creditSpreadOAS: 6.2,
        cdsInsuranceIndex: 125,
        twFuturesNetOi: -46000,
        twMarginMaintenance: 134.0,
      });

      const thermo = calculateMacroThermometer(macro);
      expect(thermo.score).toBeLessThanOrEqual(40);
      expect(thermo.stance).toBe('DEFENSIVE');
      expect(thermo.suggestedEquityAllocationPercent).toBeLessThanOrEqual(40);
      expect(thermo.rationale.some((r) => r.includes('倒掛') || r.includes('恐慌'))).toBe(true);
    });

    it('極端數值輸入時，分數應鎖定在 0 ~ 100 區間內', () => {
      const extremeMacro = createBaseMacro({
        yieldSpread: -5.0,
        vix: 99.0,
        creditSpreadOAS: 20.0,
        twFuturesNetOi: -100000,
      });
      const thermo = calculateMacroThermometer(extremeMacro);
      expect(thermo.score).toBeGreaterThanOrEqual(0);
      expect(thermo.score).toBeLessThanOrEqual(100);
    });
  });

  describe('6. 美股機構級信用金絲雀指標 (evaluateCreditRisk - Ticket 02)', () => {
    it('低利差與平穩 CDS 應回傳 LOW 風險等級', () => {
      const risk = evaluateCreditRisk(3.2, 55);
      expect(risk.cdsRiskLevel).toBe('LOW');
      expect(risk.isAlert).toBe(false);
    });

    it('高收益債利差飆破 5% 或 CDS 指數突破 100 時應啟動 HIGH 或 CRITICAL 警報', () => {
      const riskHigh = evaluateCreditRisk(5.5, 95);
      expect(riskHigh.cdsRiskLevel).toBe('HIGH');
      expect(riskHigh.isAlert).toBe(true);

      const riskCritical = evaluateCreditRisk(6.8, 120);
      expect(riskCritical.cdsRiskLevel).toBe('CRITICAL');
      expect(riskCritical.isAlert).toBe(true);
    });

    it('缺漏值時應安全回退為 LOW 且不噴錯', () => {
      const riskEmpty = evaluateCreditRisk(undefined, undefined);
      expect(riskEmpty.cdsRiskLevel).toBe('LOW');
      expect(riskEmpty.isAlert).toBe(false);
    });
  });

  describe('7. 台股專屬籌碼金絲雀指標 (evaluateTwMarketRisk - Ticket 03)', () => {
    it('外資空單突破 3 萬口標記 HIGH_ALERT，突破 4.5 萬口標記 EXTREME_SHORT', () => {
      const alertRisk = evaluateTwMarketRisk(-32000, 165);
      expect(alertRisk.twFuturesRiskLevel).toBe('HIGH_ALERT');

      const extremeRisk = evaluateTwMarketRisk(-48000, 160);
      expect(extremeRisk.twFuturesRiskLevel).toBe('EXTREME_SHORT');
    });

    it('融資維持率低於 140% 為 WARNING，低於 130% 斷頭線為 LIQUIDATION_RISK', () => {
      const warn = evaluateTwMarketRisk(-10000, 138);
      expect(warn.twMarginRiskLevel).toBe('WARNING');

      const liquidation = evaluateTwMarketRisk(-10000, 128);
      expect(liquidation.twMarginRiskLevel).toBe('LIQUIDATION_RISK');
    });
  });

  describe('8. 個人防護盾 1-Day 95% 在險價值與匯率敏感度 (calculate1DayVaR95 & calculateFxDelta - Ticket 04)', () => {
    it('遵循 1.65 * (vol / sqrt(252)) * NAV 公式精準計算 95% VaR', () => {
      // NAV = 10,000,000, 年化波動度 16% => 1.65 * (0.16 / sqrt(252)) * 10,000,000
      // sqrt(252) 約 15.8745
      // dailyVol = 0.16 / 15.874507866 = 0.01007905
      // VaR = 1.65 * 0.01007905 * 10,000,000 = 166,304
      const varTWD = calculate1DayVaR95(10000000, 0.16);
      expect(varTWD).toBeCloseTo(166304, -2); // 允許百元內誤差
    });

    it('零或負淨值時 VaR 應安全為 0', () => {
      expect(calculate1DayVaR95(0)).toBe(0);
      expect(calculate1DayVaR95(-500000)).toBe(0);
    });

    it('計算台幣升值 1 元對美股資產之匯損敏感度 (FX Delta)', () => {
      // 假設持有 100,000 USD 美股資產，台幣每升值 1 元即損失 100,000 TWD
      const delta = calculateFxDelta(100000);
      expect(delta).toBe(100000);
      expect(calculateFxDelta(0)).toBe(0);
    });
  });

  describe('9. 個人防護盾 3 階急速壓力測試矩陣 (calculateQuickStressMatrix - Ticket 05)', () => {
    it('無負債借款時，各階維持率均為安全上限 (999.9%) 且追繳缺口為 0', () => {
      const scenarios = calculateQuickStressMatrix(2000000, 0);
      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].stressedMarginRatioPercent).toBe(999.9);
      expect(scenarios[0].marginCallShortfallTWD).toBe(0);
      expect(scenarios[0].status).toBe('SAFE');
    });

    it('有借款時，應精確試算 -10%、-20%、-30% 擔保品市值與 130% 追繳缺口', () => {
      // 擔保品 1,000,000，質押借款 700,000 (初始維持率 142.8% WARNING)
      // 130% 追繳門檻為 700,000 * 1.3 = 910,000
      // -10%: 市值 900,000 (< 910,000) => 維持率 128.6% (MARGIN_CALL), 缺口 910,000 - 900,000 = 10,000
      // -20%: 市值 800,000 => 維持率 114.3% (MARGIN_CALL), 缺口 910,000 - 800,000 = 110,000
      // -30%: 市值 700,000 => 維持率 100.0% (MARGIN_CALL), 缺口 910,000 - 700,000 = 210,000
      const scenarios = calculateQuickStressMatrix(1000000, 700000);
      expect(scenarios).toHaveLength(3);

      expect(scenarios[0].dropPercent).toBe(-10);
      expect(scenarios[0].stressedCollateralTWD).toBe(900000);
      expect(scenarios[0].stressedMarginRatioPercent).toBe(128.6);
      expect(scenarios[0].marginCallShortfallTWD).toBe(10000);
      expect(scenarios[0].status).toBe('MARGIN_CALL');

      expect(scenarios[1].dropPercent).toBe(-20);
      expect(scenarios[1].stressedCollateralTWD).toBe(800000);
      expect(scenarios[1].stressedMarginRatioPercent).toBe(114.3);
      expect(scenarios[1].marginCallShortfallTWD).toBe(110000);

      expect(scenarios[2].dropPercent).toBe(-30);
      expect(scenarios[2].stressedCollateralTWD).toBe(700000);
      expect(scenarios[2].stressedMarginRatioPercent).toBe(100);
      expect(scenarios[2].marginCallShortfallTWD).toBe(210000);
    });
  });

  describe('10. 彭博式三段時序雷達與營收除息 (groupCatalystsByTimeline - Ticket 07)', () => {
    it('應精確將事件分類為今日、7日內、30日內三段區間', () => {
      const catalysts: UpcomingCatalyst[] = [
        { id: '1', name: '台指結算', date: '2026-10-17', daysLeft: 0, category: 'DERIVATIVE_SETTLEMENT', description: '' },
        { id: '2', name: '台積電法說', date: '2026-10-20', daysLeft: 3, category: 'EARNINGS', description: '' },
        { id: '3', name: 'FOMC', date: '2026-11-05', daysLeft: 19, category: 'CENTRAL_BANK', description: '' },
        { id: '4', name: '遠端事件', date: '2026-12-01', daysLeft: 45, category: 'CUSTOM', description: '' },
      ];

      const grouped = groupCatalystsByTimeline(catalysts);
      expect(grouped.today).toHaveLength(1);
      expect(grouped.today[0].name).toBe('台指結算');
      expect(grouped.within7Days).toHaveLength(1);
      expect(grouped.within7Days[0].name).toBe('台積電法說');
      expect(grouped.within30Days).toHaveLength(1);
      expect(grouped.within30Days[0].name).toBe('FOMC');
    });

    it('自動生成每月 10 號在線持股營收公布截止倒數催化劑', () => {
      // 基準日 2026-10-17，下一個 10 號是 2026-11-10 (相差 24 天)
      const event = generateMonthlyRevenueDeadlineCatalyst('2026-10-17');
      expect(event.id).toBe('monthly-revenue-deadline');
      expect(event.category).toBe('EARNINGS');
      expect(event.impact).toBe('HIGH');
      expect(event.daysLeft).toBe(24);
      expect(event.date).toBe('2026-11-10');

      // 基準日 2026-10-05，當月 10 號是 2026-10-10 (相差 5 天)
      const eventThisMonth = generateMonthlyRevenueDeadlineCatalyst('2026-10-05');
      expect(eventThisMonth.daysLeft).toBe(5);
      expect(eventThisMonth.date).toBe('2026-10-10');
    });

    it('試算持股除息預估蒸發點數 (防大盤假跌破)', () => {
      // 2330 除息 4 元，發行股數 25,930,380,000 股
      // 總蒸發市值約 103,721,520,000 TWD
      // 若大盤目前 22,000 點，大盤總市值約 70 兆 (70,000,000,000,000)
      // 蒸發點數 = 22,000 * (103,721,520,000 / 70,000,000,000,000) ≈ 32.6 點
      const points = estimateExDividendIndexImpactPoints({
        cashDividendPerShare: 4.0,
        sharesOutstanding: 25930380000,
        taiexCurrentIndex: 22000,
        taiexTotalMarketCapTWD: 70000000000000,
      });
      expect(points).toBeCloseTo(32.6, 1);
    });
  });
});


