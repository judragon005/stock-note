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
  aggregateLoanCollateral,
  estimateHoldingsAnnualDividendsTwd,
  formatCreditRiskLevelLabel,
} from './zavySlowWealthEngine';
import { HoldingPosition } from '../types/stock';
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

    it('7. [Spec 0222 / Ticket 05] 既有引擎統一：質押還款、設質鎖定防呆、真實股息導流與 30x FIRE 連動', () => {
      const snap: MacroIndicatorSnapshot = {
        usIsmPmi: 53.0,
        twPmi: 54.0,
      };
      const breadth: MultiHorizonMarketBreadth = {
        asOfDate: '2026-11-10',
        market: 'TW',
        breadth20: 18.0,
        breadth60: 40.0,
        breadth200: 55.0,
        totalFilteredStocks: 2000,
      };
      const marginStatus: MarginDeleveragingStatus = {
        asOfDate: '2026-11-10',
        indexDrawdownPercent: -7.0,
        marginDrawdownPercent: -10.0,
        marginDeleveragingRatio: 1.43,
        isDeleveragingSufficient: true,
        statusText: '融資清洗充分',
      };

      // 模擬持股：2330 (個股衛星，被質押 1000 股)、0050 (市值核心，無質押)
      const holdings = [
        {
          id: 'pos-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW' as const,
          shares: 2000,
          currentPrice: 1000,
          marketValue: 2000000,
          averageCost: 900,
          totalCost: 1800000,
          unrealizedProfit: 200000,
          unrealizedProfitPercent: 11.1,
          currency: 'TWD' as const,
        },
        {
          id: 'pos-2',
          symbol: '0050',
          name: '元大台灣50',
          market: 'TW' as const,
          shares: 5000,
          currentPrice: 200,
          marketValue: 1000000,
          averageCost: 180,
          totalCost: 900000,
          unrealizedProfit: 100000,
          unrealizedProfitPercent: 11.1,
          currency: 'TWD' as const,
        },
      ];

      const loans: import('../types/stock').LoanRecord[] = [
        {
          id: 'loan-1',
          name: '元大台積電股票質押',
          principal: 500000,
          currency: 'TWD',
          createdAt: Date.now(),
          loanType: 'PLEDGE',
          pledgedCollateral: [
            { symbol: '2330', shares: 1000 },
          ],
        },
      ];

      const report = generateZavyAnalysisReport({
        snapshot: snap,
        breadth,
        marginStatus,
        holdings: holdings as unknown as import('../types/stock').HoldingPosition[],
        cashBalanceTwd: 200000,
        loans,
        annualEstimatedDividendsTwd: 100000,
        isAtBollingerLowerBand: true,
        isBadNewsDivergenceObserved: true,
        targetAnnualExpenseTwd: 600000,
      });

      // 1. 落底核對表應接收到真實布林與利空鈍化標記
      expect(report.marketBreadth.bottomingChecklist.satisfiedCount).toBe(4);
      expect(report.marketBreadth.bottomingChecklist.bottomingReadinessScore).toBe(100);

      // 2. Track A 應包含質押還款建議與設質標籤
      expect(report.trackA.activeLoanPrincipalTwd).toBe(500000);
      expect(report.trackA.debtRepaymentSummary).toContain('500,000');
      // 2330 在 tier1SellCandidates 應帶有 🔒[設質鎖定]
      expect(report.trackA.sellWaterfallPreview.tier1SellCandidates.some((c) => c.includes('2330') && c.includes('🔒'))).toBe(true);

      // 3. Track B 應產出 30x FIRE (目標 1800 萬) 與股息活水導流計畫
      expect(report.trackB.fire30xStatus.targetCapital30xTwd).toBe(18000000);
      expect(report.trackB.dividendRedirectPlanSummary).toContain('存量不動');
      expect(typeof report.trackB.srrRiskReductionPercent).toBe('number');
    });

    it('Spec 0222 Ticket 05: 信心度應依輸入指標豐富度動態評估 (消除硬編碼假信心度)', () => {
      // 完整指標輸入 (6 項齊全) -> 信心度 100%
      const fullSnap: MacroIndicatorSnapshot = {
        usIsmPmi: 52.0,
        twPmi: 53.0,
        usNewOrdersMinusInventory: 3.0,
        usCpiYoY: 2.8,
        highYieldSpreadOas: 3.4,
        treasuryYield10y: 4.3,
      };
      const fullRes = evaluateMacroCompass(fullSnap);
      expect(fullRes.wave.confidenceScore).toBe(100);

      // 稀疏指標輸入 (僅 1 項) -> 信心度約 17%
      const sparseSnap: MacroIndicatorSnapshot = {
        usIsmPmi: 49.0,
      };
      const sparseRes = evaluateMacroCompass(sparseSnap);
      expect(sparseRes.wave.confidenceScore).toBeLessThan(30);
    });

    it('Code Smell Refactoring: aggregateLoanCollateral 應正確彙總本金與設質股數 (消除 Feature Envy)', () => {
      const mockLoans: any[] = [
        {
          id: 'loan-1',
          principal: 300000,
          pledgedCollateral: [
            { symbol: '2330', shares: 1000 },
            { symbol: '2454', shares: 500 },
          ],
        },
        {
          id: 'loan-2',
          principal: 200000,
          pledgedCollateral: [
            { symbol: '2330', shares: 500 },
          ],
        },
      ];

      const res = aggregateLoanCollateral(mockLoans);
      expect(res.activePrincipalTwd).toBe(500000);
      expect(res.pledgedSharesMap['2330']).toBe(1500);
      expect(res.pledgedSharesMap['2454']).toBe(500);
    });

    it('8. [Spec 0223 / Ticket 01] Zavy 慢富白話決策字典 18 項詞條完整性與週期/利率枚舉中文化驗證', async () => {
      const {
        ZAVY_SLOW_WEALTH_GLOSSARY,
        formatWavePhaseLabel,
        formatTreasuryStatusLabel,
      } = await import('../constants/zavyGlossary');

      const expectedKeys = [
        'M01_threeTierCycle',
        'M02_treasury10yNewNormal',
        'M03_waveBusinessCyclePmi',
        'M04_ordersMinusInventory',
        'M05_smallTruckVsBigTruck',
        'M06_creditCrackRadar',
        'B01_multiHorizonBreadth',
        'B02_decadeMaInvalidationGate',
        'B03_marginDeleveragingRatio',
        'B04_bottomingChecklist',
        'T01_dualTrackKnowYourself',
        'T02_personalRiskBudget',
        'T03_debtAsNegativeBond',
        'T04_fourTierSellWaterfall',
        'T05_trueDefensiveArmor',
        'T06_dividendRedirectRebalance',
        'T07_fire30xAndCoastFire',
        'T08_sequenceOfReturnsRisk',
      ];

      for (const key of expectedKeys) {
        const entry = ZAVY_SLOW_WEALTH_GLOSSARY[key];
        expect(entry, `Missing glossary key: ${key}`).toBeDefined();
        expect(entry.term.length).toBeGreaterThan(2);
        expect(entry.metaphor.length).toBeGreaterThan(10);
        expect(entry.meaning.length).toBeGreaterThan(10);
        expect(entry.buySignal.length).toBeGreaterThan(10);
        expect(entry.sellSignal.length).toBeGreaterThan(10);
      }

      expect(formatWavePhaseLabel('EXPANSION')).toBe('擴張成長期');
      expect(formatWavePhaseLabel('RECOVERY')).toBe('復甦期');
      expect(formatWavePhaseLabel('BOOM_MID')).toBe('榮景主升段');
      expect(formatTreasuryStatusLabel('IN_RANGE_4_TO_5_5')).toBe('4.0%~5.5% 新常態平衡區');

      const report = generateZavyAnalysisReport({
        snapshot: { treasuryYield10y: 4.4, usIsmPmi: 52.0, twPmi: 53.0 },
        breadth: {
          asOfDate: '2026-11-10',
          market: 'TW',
          breadth20: 35,
          breadth60: 50,
          breadth200: 60,
          totalFilteredStocks: 1950,
        },
        marginStatus: {
          asOfDate: '2026-11-10',
          indexDrawdownPercent: -3,
          marginDrawdownPercent: -4,
          marginDeleveragingRatio: 1.33,
          isDeleveragingSufficient: true,
          statusText: '清洗充分',
        },
        holdings: [],
        cashBalanceTwd: 100000,
      });

      expect(report.tenSecondsExecutiveSummary[0]).not.toContain('IN_RANGE_4_TO_5_5');
      expect(report.tenSecondsExecutiveSummary[0]).toContain('4.0%~5.5% 新常態平衡區');

      const md = exportZavyReportMarkdown(report);
      expect(md).not.toContain('IN_RANGE_4_TO_5_5');
      expect(md).toContain('擴張成長期');
    });

    it('8. [Spec 0224 / Ticket 01] estimateHoldingsAnnualDividendsTwd 應正確估算年度股息現金活水 (TDD Seam)', () => {
      // 1. 空持股或無效輸入
      expect(estimateHoldingsAnnualDividendsTwd([])).toBe(0);
      expect(estimateHoldingsAnnualDividendsTwd(undefined as any)).toBe(0);

      // 2. 正常台股持股 (自訂殖利率 5.0%)
      const twHolding: HoldingPosition = {
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        avgCost: 1000,
        totalCostBasis: 1000000,
        currency: 'TWD',
        market: 'TW',
        yieldOnCostPercent: 5.0,
      } as HoldingPosition;
      // 1,000,000 * 5% = 50,000
      expect(estimateHoldingsAnnualDividendsTwd([twHolding])).toBe(50000);

      // 3. 正常台股持股 (未提供殖利率 ➔ 預設 4.5% 防禦性底標)
      const twDefaultYield: HoldingPosition = {
        symbol: '0050',
        name: '元大台灣50',
        shares: 1000,
        avgCost: 100,
        totalCostBasis: 100000,
        currency: 'TWD',
        market: 'TW',
      } as HoldingPosition;
      // 100,000 * 4.5% = 4,500
      expect(estimateHoldingsAnnualDividendsTwd([twDefaultYield])).toBe(4500);

      // 4. 美股持股匯率折算 (USD 乘上匯率 32，未提供殖利率 ➔ 4.5%)
      const usHolding: HoldingPosition = {
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 200,
        totalCostBasis: 2000, // 2000 USD * 32 = 64,000 TWD
        currency: 'USD',
        market: 'US',
      } as HoldingPosition;
      // 64,000 * 4.5% = 2,880
      expect(estimateHoldingsAnnualDividendsTwd([usHolding], 32)).toBe(2880);

      // 5. 平倉或零股數過濾 (isClosed: true 或 shares <= 0 應被剔除)
      const closedHolding: HoldingPosition = {
        symbol: '2603',
        name: '長榮',
        shares: 1000,
        avgCost: 150,
        totalCostBasis: 150000,
        currency: 'TWD',
        market: 'TW',
        isClosed: true,
      } as HoldingPosition;
      const zeroShareHolding: HoldingPosition = {
        symbol: '2454',
        name: '聯發科',
        shares: 0,
        avgCost: 1000,
        totalCostBasis: 0,
        currency: 'TWD',
        market: 'TW',
      } as HoldingPosition;

      // 組合驗算：twHolding(50000) + twDefaultYield(4500) + usHolding(2880) + closedHolding(0) + zeroShareHolding(0) = 57380
      const total = estimateHoldingsAnnualDividendsTwd(
        [twHolding, twDefaultYield, usHolding, closedHolding, zeroShareHolding],
        32
      );
      expect(total).toBe(57380);
    });

    it('9. [Spec 0224 / Ticket 02] formatCreditRiskLevelLabel 應正確將信用風險等級中文化且 Markdown 導出採用 (TDD Seam)', () => {
      // 1. 各等級中文化
      expect(formatCreditRiskLevelLabel('LOW')).toBe('低風險穩健');
      expect(formatCreditRiskLevelLabel('ELEVATED')).toBe('偏高警戒');
      expect(formatCreditRiskLevelLabel('HIGH')).toBe('高風險承壓');
      expect(formatCreditRiskLevelLabel('CRITICAL')).toBe('極端危急');
      expect(formatCreditRiskLevelLabel(undefined)).toBe('未知');
      expect(formatCreditRiskLevelLabel('UNKNOWN_FOO')).toBe('UNKNOWN_FOO');

      // 2. Markdown 導出中應呈現繁中標籤而非英文枚舉
      const snap: MacroIndicatorSnapshot = {
        treasuryYield10y: 4.4,
        usIsmPmi: 52.0,
        highYieldSpreadOas: 3.2,
      };
      const breadth: MultiHorizonMarketBreadth = {
        asOfDate: '2026-11-10',
        market: 'TW',
        breadth20: 30,
        breadth60: 45,
        breadth200: 55,
        totalFilteredStocks: 2000,
      };
      const marginStatus: MarginDeleveragingStatus = {
        asOfDate: '2026-11-10',
        indexDrawdownPercent: -5,
        marginDrawdownPercent: -6,
        marginDeleveragingRatio: 1.2,
        isDeleveragingSufficient: true,
        statusText: '清洗充分',
      };
      const report = generateZavyAnalysisReport({
        snapshot: snap,
        breadth,
        marginStatus,
        holdings: [],
        cashBalanceTwd: 100000,
      });

      const md = exportZavyReportMarkdown(report);
      // 驗證 OAS <= 3.5 時觸發 ELEVATED，正確輸出繁體中文「偏高警戒」且無原始英文枚舉
      expect(md).toContain('風險等級【偏高警戒】');
      expect(md).not.toContain('風險等級【ELEVATED】');
      expect(md).not.toContain('風險等級【LOW】');
    });
  });
});
