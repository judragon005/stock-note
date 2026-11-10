import { describe, it, expect } from 'vitest';
import {
  evaluateMacroCompass,
  evaluateCycleCoupledBreadth,
  evaluateMarginDeleveraging,
  evaluateBottomingChecklist,
  generateTrackADecision,
  generateZavyAnalysisReport,
  exportZavyReportMarkdown,
  exportZavyRawDataCsv,
} from './zavySlowWealthEngine';
import {
  MacroIndicatorSnapshot,
  MultiHorizonMarketBreadth,
  MarginDeleveragingStatus,
} from '../types/zavySlowWealth';

describe('Zavy Slow Wealth Engine (慢富三級週期、市場寬度與 A/B 雙軌決策引擎)', () => {
  describe('1. 總經三級週期羅盤 (evaluateMacroCompass)', () => {
    it('應正確判定 10Y 美債殖利率新常態區間 (4.0% ~ 5.5%)', () => {
      const snapNormal: MacroIndicatorSnapshot = {
        treasuryYield10y: 4.45,
        usIsmPmi: 51.5,
      };
      const resNormal = evaluateMacroCompass(snapNormal);
      expect(resNormal.tidal.treasury10yNewNormalStatus).toBe('IN_RANGE_4_TO_5_5');

      const snapHigh: MacroIndicatorSnapshot = {
        treasuryYield10y: 5.85,
        usIsmPmi: 51.5,
      };
      const resHigh = evaluateMacroCompass(snapHigh);
      expect(resHigh.tidal.treasury10yNewNormalStatus).toBe('ABOVE_RANGE');
    });

    it('應正確識別製造業商業庫存循環階段 (RECOVERY / EXPANSION / BOOM_MID / MID_CYCLE_SLOWDOWN)', () => {
      // 復甦期：PMI 回升至 50 附近，新訂單減庫存翻正
      const recoverySnap: MacroIndicatorSnapshot = {
        usIsmPmi: 49.8,
        usNewOrdersMinusInventory: 3.5,
        twPmi: 51.2,
        twExportOrdersYoY: 5.8,
      };
      const recoveryRes = evaluateMacroCompass(recoverySnap);
      expect(recoveryRes.wave.phase).toBe('RECOVERY');

      // 榮景主升段：PMI > 55
      const boomSnap: MacroIndicatorSnapshot = {
        usIsmPmi: 56.2,
        usNewOrdersMinusInventory: 6.2,
        twPmi: 57.5,
        twExportOrdersYoY: 18.5,
      };
      const boomRes = evaluateMacroCompass(boomSnap);
      expect(boomRes.wave.phase).toBe('BOOM_MID');
    });

    it('應正確識別台灣小車（領先 3~6 個月）vs 美國大卡車的領先關係', () => {
      // 台灣 PMI 與外銷訂單強勁反彈，美國 ISM 仍在 49
      const leadSnap: MacroIndicatorSnapshot = {
        twPmi: 54.5,
        twExportOrdersYoY: 12.0,
        usIsmPmi: 49.5,
      };
      const leadRes = evaluateMacroCompass(leadSnap);
      expect(leadRes.wave.smallTruckVsBigTruckStatus.twStatus).toBe('LEADING_UP');
      expect(leadRes.wave.smallTruckVsBigTruckStatus.leadTimeMonths).toBeGreaterThanOrEqual(3);
    });

    it('信用裂痕雷達：應能預警高收益債利差極低過熱 (<3.5%) 或 CCC 垃圾債利差走闊', () => {
      const tightSnap: MacroIndicatorSnapshot = {
        highYieldSpreadOas: 3.15, // 3.15% 極度過熱
        cccHighYieldSpread: 7.2,
      };
      const tightRes = evaluateMacroCompass(tightSnap);
      expect(tightRes.creditRadar.isOasOverheatedLow).toBe(true);

      const stressSnap: MacroIndicatorSnapshot = {
        highYieldSpreadOas: 4.8,
        cccHighYieldSpread: 9.8, // CCC 率先飆高
      };
      const stressRes = evaluateMacroCompass(stressSnap);
      expect(stressRes.creditRadar.hasEarlyCccStress).toBe(true);
      expect(stressRes.creditRadar.creditRiskLevel).toBe('HIGH');
    });
  });

  describe('2. 週期情境耦合寬度解讀 (evaluateCycleCoupledBreadth)', () => {
    it('在擴張/榮景期中，20MA 寬度 <20% 應解讀為波浪回檔買點，嚴禁觸發減碼', () => {
      const breadth: MultiHorizonMarketBreadth = {
        asOfDate: '2026-11-10',
        market: 'TW',
        breadth20: 16.5, // 極度超賣
        breadth60: 42.0,
        breadth200: 68.0,
        totalFilteredStocks: 1950,
      };

      const interpretation = evaluateCycleCoupledBreadth(breadth, 'EXPANSION', false);
      expect(interpretation.isOversoldOpportuneBuy).toBe(true);
      expect(interpretation.is200MaDivergenceInvalidated).toBe(false);
      expect(interpretation.actionGuidance).toContain('勿對漣漪起反應');
    });

    it('在大型空頭 (跌破十年線) 中，200MA 寬度超賣鈍化應標記失效，改看 T10YIE 平衡通膨率', () => {
      const breadth: MultiHorizonMarketBreadth = {
        asOfDate: '2026-11-10',
        market: 'TW',
        breadth20: 8.5,
        breadth60: 12.0,
        breadth200: 14.5,
        totalFilteredStocks: 1950,
      };

      const interpretation = evaluateCycleCoupledBreadth(breadth, 'RECESSION', true);
      expect(interpretation.is200MaDivergenceInvalidated).toBe(true);
      expect(interpretation.fallbackIndicator).toContain('T10YIE');
    });
  });

  describe('3. 融資去槓桿比率 (evaluateMarginDeleveraging)', () => {
    it('當融資減幅大於指數跌幅 (比率 >= 1.0) 時，應判定融資去槓桿充分', () => {
      const resultSufficient = evaluateMarginDeleveraging({
        indexDrawdownPercent: -8.0,
        marginDrawdownPercent: -12.5,
      });

      expect(resultSufficient.marginDeleveragingRatio).toBe(1.56);
      expect(resultSufficient.isDeleveragingSufficient).toBe(true);
    });

    it('當指數大跌但融資不退反增時，應判定槓桿未清洗乾淨', () => {
      const resultUncleaned = evaluateMarginDeleveraging({
        indexDrawdownPercent: -10.0,
        marginDrawdownPercent: -4.0,
      });

      expect(resultUncleaned.marginDeleveragingRatio).toBe(0.4);
      expect(resultUncleaned.isDeleveragingSufficient).toBe(false);
    });
  });

  describe('4. 中期修正落底核對表 (evaluateBottomingChecklist)', () => {
    it('應綜合檢查四大落底要件並計算落底就緒度', () => {
      const marginStatus: MarginDeleveragingStatus = {
        asOfDate: '2026-11-10',
        indexDrawdownPercent: -10,
        marginDrawdownPercent: -14,
        marginDeleveragingRatio: 1.4,
        isDeleveragingSufficient: true,
        statusText: '融資清洗充分',
      };

      const checklist = evaluateBottomingChecklist({
        marginStatus,
        breadth20: 18.0, // 超賣
        isAtBollingerLowerBand: true,
        isBadNewsDivergenceObserved: true,
      });

      expect(checklist.satisfiedCount).toBe(4);
      expect(checklist.totalCount).toBe(4);
      expect(checklist.verdict).toBe('BOTTOM_SIGNAL_CONFIRMED');
      expect(checklist.bottomingReadinessScore).toBe(100);
    });
  });

  describe('5. A 軌波段調節與個人風險預算 (generateTrackADecision)', () => {
    it('應依個人最大可承受回撤 (20%) 與壓力情境跌幅 (30%) 反推持股上限 (66.7%)', () => {
      const decision = generateTrackADecision({
        cyclePhase: 'BOOM_MID',
        maxDrawdownTolerancePercent: 20,
        stressScenarioDrawdownPercent: 30,
        currentEquityWeightPercent: 85,
        holdings: [],
      });

      // 週期建議榮景主升段為 80%~85%
      // 個人風險預算上限為 20 / 30 = 66.7%
      // 最終建議應取兩者交集收斂為 66.7% (守護個人風險偏好)
      expect(decision.riskBudgetMaxEquityExposurePercent).toBeCloseTo(66.7, 1);
      expect(decision.finalSuggestedEquityExposurePercent).toBeCloseTo(66.7, 1);
    });
  });

  describe('6. 綜合全景報告導出 (exportZavyReportMarkdown & exportZavyRawDataCsv)', () => {
    it('應產出合規 Markdown 與 CSV 交付報告', () => {
      const snap: MacroIndicatorSnapshot = {
        usIsmPmi: 52.0,
        twPmi: 53.5,
        treasuryYield10y: 4.35,
        highYieldSpreadOas: 3.4,
      };
      const breadth: MultiHorizonMarketBreadth = {
        asOfDate: '2026-11-10',
        market: 'TW',
        breadth20: 25.0,
        breadth60: 45.0,
        breadth200: 60.0,
        totalFilteredStocks: 1950,
      };
      const marginStatus: MarginDeleveragingStatus = {
        asOfDate: '2026-11-10',
        indexDrawdownPercent: -6.0,
        marginDrawdownPercent: -8.0,
        marginDeleveragingRatio: 1.33,
        isDeleveragingSufficient: true,
        statusText: '融資清洗充分',
      };

      const report = generateZavyAnalysisReport({
        snapshot: snap,
        breadth,
        marginStatus,
        holdings: [],
        cashBalanceTwd: 100000,
      });

      const md = exportZavyReportMarkdown(report);
      expect(md).toContain('Zavy 台美股總經三級週期定位與 A/B 雙軌配置報告');
      expect(md).toContain('10 秒即食摘要');
      expect(md).toContain('第一層：總體經濟與三級週期定位');
      expect(md).toContain('第二層：台美市場結構、寬度與去槓桿');
      expect(md).toContain('第三層：A/B 雙軌決策與個人風險預算');

      const csv = exportZavyRawDataCsv(snap, breadth);
      expect(csv).toContain('MetricKey,MetricName,Value,Unit,AsOfDate');
      expect(csv).toContain('us_ism_pmi,美國 ISM 製造業 PMI,52,指數,2026-11-10');
    });
  });
});
