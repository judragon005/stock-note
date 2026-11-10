/**
 * Zavy「散戶慢富之路」總體經濟三級週期、市場結構寬度與 A/B 雙軌配置系統型別定義
 * Spec 0221 / ADR-0221 / Issue #472
 */

// ==========================================
// 1. 三級總經週期定義 (Tidal, Wave, Ripple)
// ==========================================

export type TidalRegime =
  | 'PRODUCTIVITY_EXPANSION' // 生產力擴張大週期 (AI/科技驅動)
  | 'STAGFLATION_PRESSURE'   // 停滯性通膨壓力期
  | 'STRUCTURAL_TRANSITION'; // 結構轉型過渡期

export type WaveBusinessCyclePhase =
  | 'RECOVERY'               // 1. 復甦期 (庫存見底、訂單回溫)
  | 'EXPANSION'              // 2. 擴張成長期 (PMI 50~55 穩健擴張)
  | 'BOOM_MID'               // 3. 榮景主升段 (PMI > 55，獲利強勁)
  | 'BOOM_LATE'              // 4. 榮景末升段 (過熱警戒、局部信用裂痕)
  | 'MID_CYCLE_SLOWDOWN'     // 5. 中期趨緩/庫存調整 (非實質衰退)
  | 'RECESSION';             // 6. 實質經濟衰退 (系統性失業與違約)

export interface MacroIndicatorSnapshot {
  usIsmPmi?: number;                // 美國 ISM 製造業 PMI (如 52.4)
  usNewOrdersMinusInventory?: number;// 美國新訂單減客戶庫存
  twPmi?: number;                   // 台灣製造業 PMI (中經院)
  twRevenueDiffusionIndex?: number; // 台灣上市櫃月營收擴散指數 % (50 為榮枯線)
  twExportOrdersYoY?: number;       // 台灣外銷訂單 / 全市場營收年增率 %
  twLeadingIndicatorYoY?: number;   // 國發會景氣領先指標變動率 %
  treasuryYield10y?: number;        // 美國 10 年期公債殖利率 (新常態 4.0%~5.5%)
  treasuryYield2y?: number;         // 美國 2 年期公債殖利率
  yieldSpread10y2y?: number;        // 10Y-2Y 殖利率倒掛/利差
  breakevenInflation10y?: number;   // 10 年平衡通膨率 (T10YIE)
  highYieldSpreadOas?: number;      // 美銀美林高收益債利差 (3.0%~3.5% 極低警戒)
  cccHighYieldSpread?: number;      // CCC 級垃圾債利差 (早期裂痕)
  investmentGradeSpreadOas?: number;// 投資級公司債利差
  initialJoblessClaims?: number;    // 初請失業金人數 (4週移動平均)
  usCpiYoY?: number;                // 美國 CPI 年增率 %
  twMarginMaintenanceRatio?: number;// 台股融資維持率 % (130% 斷頭警戒線)
}

export interface MacroCompassEvaluation {
  tidal: {
    regime: TidalRegime;
    treasury10yNewNormalStatus: 'BELOW_RANGE' | 'IN_RANGE_4_TO_5_5' | 'ABOVE_RANGE';
    narrative: string;
  };
  wave: {
    phase: WaveBusinessCyclePhase;
    confidenceScore: number;         // 判定信心分 (0~100)
    cycleSummary: string;
    smallTruckVsBigTruckStatus: {
      twStatus: 'LEADING_UP' | 'LEADING_DOWN' | 'SYNCHRONIZED';
      leadTimeMonths: number;        // 台灣小車領先美國大卡車月數 (通常 3~6 個月)
      commentary: string;
    };
  };
  creditRadar: {
    isOasOverheatedLow: boolean;     // HY 利差 <= 3.5% (過度樂觀定價)
    hasEarlyCccStress: boolean;      // CCC 債利差率先拉開
    creditRiskLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
    warningMessage?: string;
  };
}

// ==========================================
// 2. 市場結構、多週期寬度與融資去槓桿型別
// ==========================================

export interface MultiHorizonMarketBreadth {
  asOfDate: string;
  market: 'TW' | 'US';
  breadth20: number;                 // 站上 20MA 比例 %
  breadth60: number;                 // 站上 60MA 比例 %
  breadth200: number;                // 站上 200MA 比例 %
  totalFilteredStocks: number;       // 有效成分股數 (已排除殭屍股)
}

export interface MarginDeleveragingStatus {
  asOfDate: string;
  indexDrawdownPercent: number;      // 大盤指數波段回撤 % (如 -8.5%)
  marginDrawdownPercent: number;     // 融資餘額減幅 % (如 -12.0%)
  marginDeleveragingRatio: number;   // 融資減幅 / 指數回撤 (例如 1.41)
  isDeleveragingSufficient: boolean; // 比率 >= 1.0 代表融資清洗充分
  statusText: string;
}

export interface BottomingChecklistItem {
  id: string;
  label: string;
  isSatisfied: boolean;
  actualValueDescription: string;
  thresholdDescription: string;
}

export interface BottomingChecklistResult {
  checklist: BottomingChecklistItem[];
  satisfiedCount: number;
  totalCount: number;
  bottomingReadinessScore: number;   // 0~100 落底就緒度
  verdict: 'NOT_BOTTOMED' | 'DEVELOPING' | 'BOTTOM_SIGNAL_CONFIRMED';
  guidanceText: string;
}

export interface CycleCoupledBreadthInterpretation {
  breadth20: number;
  breadth60: number;
  breadth200: number;
  isOversoldOpportuneBuy: boolean;   // 上行期寬度 <20% ➔ 黃金回檔買點 (非減碼)
  is200MaDivergenceInvalidated: boolean; // 大型空頭跌破十年線 ➔ 200MA 寬度鈍化失效
  fallbackIndicator: string;         // 鈍化時改看的錨點 (如 'T10YIE 10年平衡通膨率與 CCC 債利差插針見底')
  interpretationHeadline: string;
  actionGuidance: string;
}

// ==========================================
// 3. A/B 雙軌決策與報告產出型別
// ==========================================

export interface TrackADecision {
  cyclePhase: WaveBusinessCyclePhase;
  recommendedEquityWeightRange: [number, number]; // [最低%, 最高%] (如 [60, 70] 或 [80, 85])
  recommendedEquityWeightMid: number;
  maxDrawdownTolerancePercent: number;          // 個人可承受帳面回撤 (例如 20%)
  stressScenarioDrawdownPercent: number;        // 壓力情境預期跌幅 (如 30%)
  riskBudgetMaxEquityExposurePercent: number;   // 個人風險預算反推上限 (回撤 / 壓力跌幅)
  finalSuggestedEquityExposurePercent: number;  // 取週期水位與風險預算之交集極小值
  recommendedActionSummary: string;
  currentEquityWeightPercent?: number;
  debtRepaymentSummary?: string;
  activeLoanPrincipalTwd?: number;
  sellWaterfallPreview: {
    tier1SellCandidates: string[];
    tier2SellCandidates: string[];
    tier3PreservedCandidates: string[];
    tier4CoreHoldings: string[];
  };
}

export interface TrackBDecision {
  currentAssetAllocation: {
    equityPercent: number;
    govBondPercent: number;
    corpBondPercent: number;
    goldPercent: number;
    reitsPercent: number;
    cashPercent: number;
  };
  targetAllocation: {
    equityPercent: number;
    govBondPercent: number;
    goldPercent: number;
    cashPercent: number;
  };
  isRebalanceRecommended: boolean;
  rebalanceTriggerReason?: string;
  dividendRedirectPlanSummary?: string;
  dividendRedirectDetails?: Array<{ targetCategory: string; allocationPercent: number; amountTwd: number }>;
  fire30xStatus: {
    targetCapital30xTwd: number;
    currentProgressPercent: number;
    isCoastFireAchieved: boolean;
  };
  srrRiskReductionPercent?: number;
  equityOnlyExhaustionRate?: number;
  shieldedExhaustionRate?: number;
}

export interface ZavyComprehensiveAnalysisReport {
  generatedAt: string;
  macroCompass: MacroCompassEvaluation;
  marketBreadth: {
    tw: MultiHorizonMarketBreadth;
    marginDeleveraging: MarginDeleveragingStatus;
    interpretation: CycleCoupledBreadthInterpretation;
    bottomingChecklist: BottomingChecklistResult;
  };
  trackA: TrackADecision;
  trackB: TrackBDecision;
  tenSecondsExecutiveSummary: string[];
}

