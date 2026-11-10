/**
 * zavySlowWealthEngine.ts
 * Zavy「散戶慢富之路」總體經濟三級週期定位、市場結構寬度與 A/B 雙軌決策核心純函式引擎
 * Spec 0221 / ADR-0221 / Issue #472
 */

import {
  MacroIndicatorSnapshot,
  MacroCompassEvaluation,
  WaveBusinessCyclePhase,
  MultiHorizonMarketBreadth,
  MarginDeleveragingStatus,
  BottomingChecklistResult,
  BottomingChecklistItem,
  CycleCoupledBreadthInterpretation,
  TrackADecision,
  TrackBDecision,
  ZavyComprehensiveAnalysisReport,
} from '../types/zavySlowWealth';
import { HoldingPosition, LoanRecord } from '../types/stock';
import {
  calculateAssetClassRebalancePlan,
  classifyZavyAssetClass,
} from './rebalancingEngine';
import {
  calculateSlowWealthFireMetrics,
} from './monteCarloFireEngine';
import { TargetAllocationConfig } from '../types/allocation';

/**
 * 1. 總經三級週期羅盤引擎 (Tidal, Wave, Credit Radar)
 */
export function evaluateMacroCompass(
  snapshot: MacroIndicatorSnapshot
): MacroCompassEvaluation {
  const {
    usIsmPmi,
    usNewOrdersMinusInventory,
    twPmi,
    twExportOrdersYoY,
    treasuryYield10y,
    highYieldSpreadOas,
    cccHighYieldSpread,
  } = snapshot;

  // 1. 潮汐大週期 (Tidal / 30 年通膨與殖利率新常態)
  let treasury10yNewNormalStatus: 'BELOW_RANGE' | 'IN_RANGE_4_TO_5_5' | 'ABOVE_RANGE' = 'IN_RANGE_4_TO_5_5';
  let tidalNarrative = '目前處於 AI 與先進半導體驅動之全球生產力大週期擴張期。';

  if (typeof treasuryYield10y === 'number') {
    if (treasuryYield10y < 4.0) {
      treasury10yNewNormalStatus = 'BELOW_RANGE';
      tidalNarrative += ' 10年美債低於 4.0%，反映市場對寬鬆或景氣放緩預期。';
    } else if (treasuryYield10y > 5.5) {
      treasury10yNewNormalStatus = 'ABOVE_RANGE';
      tidalNarrative += ' 10年美債突破 5.5%，長期利率中樞過高，需警惕評價面擠壓風險。';
    } else {
      treasury10yNewNormalStatus = 'IN_RANGE_4_TO_5_5';
      tidalNarrative += ' 10年美債殖利率處於 4.0%~5.5% 新常態平衡區間。';
    }
  }

  // 2. 商業庫存波浪週期 (Wave / 2~4 年製造業週期)
  let phase: WaveBusinessCyclePhase = 'EXPANSION';
  let confidenceScore = 80;
  let cycleSummary = '全球製造業穩健擴張。';

  // 依據美國大卡車 (ISM PMI 與新訂單減庫存) 為主軸，台灣小車 (出口訂單) 為領先輔助
  const hasUsPmi = typeof usIsmPmi === 'number';
  const hasTwPmi = typeof twPmi === 'number';
  const effUsPmi = usIsmPmi ?? (hasTwPmi ? twPmi! : 50.0);
  const effTwPmi = twPmi ?? (hasUsPmi ? usIsmPmi! : 50.0);
  const newOrdersMinusInv = usNewOrdersMinusInventory ?? 0;

  if (effUsPmi < 48.0 && newOrdersMinusInv < -2.0) {
    phase = 'RECESSION';
    cycleSummary = '製造業深陷收縮，實質衰退風險攀升。';
    confidenceScore = 85;
  } else if ((effUsPmi <= 52.0 || effTwPmi <= 52.0) && newOrdersMinusInv > 0) {
    phase = 'RECOVERY';
    cycleSummary = '庫存去化接近尾聲，新訂單減庫存翻正，製造業步入復甦期。';
    confidenceScore = 85;
  } else if (effUsPmi >= 55.0 || effTwPmi >= 56.0) {
    if ((snapshot.usCpiYoY ?? 0) > 3.8 || (highYieldSpreadOas ?? 4) < 3.3) {
      phase = 'BOOM_LATE';
      cycleSummary = '製造業榮景末升段，景氣處於過熱頂峰，需防範估值透支。';
    } else {
      phase = 'BOOM_MID';
      cycleSummary = '製造業榮景主升段，需求旺盛，獲利全面開展。';
    }
    confidenceScore = 90;
  } else if (effUsPmi >= 50.0 && effTwPmi >= 50.0) {
    phase = 'EXPANSION';
    cycleSummary = '美台製造業同步處於 50 以上健康擴張期。';
    confidenceScore = 85;
  } else {
    phase = 'MID_CYCLE_SLOWDOWN';
    cycleSummary = '製造業處於中期庫存調整與趨緩階段。';
    confidenceScore = 75;
  }

  // 台灣小車 vs 美國大卡車領先判定
  let twStatus: 'LEADING_UP' | 'LEADING_DOWN' | 'SYNCHRONIZED' = 'SYNCHRONIZED';
  let leadTimeMonths = 0;
  let truckCommentary = '台美製造業週期基本同步。';

  if (effTwPmi > effUsPmi + 2.5 || (twExportOrdersYoY ?? 0) > 10.0) {
    twStatus = 'LEADING_UP';
    leadTimeMonths = 3;
    truckCommentary = '台灣小車（出口外需與半導體）已率先加速回溫，預示美國大卡車將於 1~2 季後跟進。';
  } else if (effTwPmi < effUsPmi - 2.5) {
    twStatus = 'LEADING_DOWN';
    leadTimeMonths = 3;
    truckCommentary = '台灣小車率先面臨庫存堆積壓力，預告後續大卡車動能將趨緩。';
  }

  // 3. 信用裂痕雷達
  const isOasOverheatedLow = typeof highYieldSpreadOas === 'number' && highYieldSpreadOas <= 3.5;
  const hasEarlyCccStress = typeof cccHighYieldSpread === 'number' && cccHighYieldSpread >= 8.5;

  let creditRiskLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'LOW';
  let warningMessage: string | undefined;

  if (hasEarlyCccStress && isOasOverheatedLow) {
    creditRiskLevel = 'HIGH';
    warningMessage = '⚠️ 警示：整體高收益債利差處於過熱低檔，但最底層 CCC 債利差率先拉開，浮現早期信貸裂痕！';
  } else if (hasEarlyCccStress) {
    creditRiskLevel = 'HIGH';
    warningMessage = '⚠️ CCC 級高風險企業融資成本劇增，警惕非系統性信貸風險傳導。';
  } else if (isOasOverheatedLow) {
    creditRiskLevel = 'ELEVATED';
    warningMessage = 'ℹ️ 高收益債利差極低 (<=3.5%)，市場對信用風險極端樂觀，防禦資產應維持配置。';
  }

  return {
    tidal: {
      regime: 'PRODUCTIVITY_EXPANSION',
      treasury10yNewNormalStatus,
      narrative: tidalNarrative,
    },
    wave: {
      phase,
      confidenceScore,
      cycleSummary,
      smallTruckVsBigTruckStatus: {
        twStatus,
        leadTimeMonths,
        commentary: truckCommentary,
      },
    },
    creditRadar: {
      isOasOverheatedLow,
      hasEarlyCccStress,
      creditRiskLevel,
      warningMessage,
    },
  };
}

/**
 * 2. 週期情境耦合寬度解讀
 */
export function evaluateCycleCoupledBreadth(
  breadth: MultiHorizonMarketBreadth,
  cyclePhase: WaveBusinessCyclePhase,
  isDecadeMovingAverageBroken: boolean = false
): CycleCoupledBreadthInterpretation {
  const { breadth20, breadth60, breadth200 } = breadth;

  // 上行/擴張期中，20MA 寬度 < 20%
  const isUpCycle =
    cyclePhase === 'RECOVERY' || cyclePhase === 'EXPANSION' || cyclePhase === 'BOOM_MID';
  const isOversoldOpportuneBuy = isUpCycle && breadth20 < 20.0;

  // 大型空頭（跌破十年線且衰退）：200MA 寬度鈍化失效
  const is200MaDivergenceInvalidated = isDecadeMovingAverageBroken || cyclePhase === 'RECESSION';

  let fallbackIndicator = '200MA 寬度長期趨勢過濾';
  let interpretationHeadline = '市場結構健康';
  let actionGuidance = '持股續抱，按既定比例定期定額。';

  if (is200MaDivergenceInvalidated) {
    fallbackIndicator = 'T10YIE 10年平衡通膨率與 CCC 債利差插針見底';
    interpretationHeadline = '⚠️ 大型空頭結構：200MA 寬度超賣鈍化失效';
    actionGuidance =
      '指數跌破十年線且處於實質衰退期，傳統均線寬度無法提供支撐，改看 T10YIE 通膨預期與高收益利差插針落底。';
  } else if (isOversoldOpportuneBuy) {
    interpretationHeadline = '💎 製造業擴張期之波浪回檔黃金買點';
    actionGuidance =
      '總經大趨勢維持上行，短期 20MA 寬度急速超賣屬於非系統性「漣漪震盪」，勿對漣漪起反應，切忌砍在阿呆谷，逢回分批加碼。';
  } else if (breadth20 > 80.0) {
    interpretationHeadline = '🔥 短線結構過熱';
    actionGuidance = '短線漲多乖離偏高，避免追高個股，可適度分批回收獲利或股息轉向防彈衣。';
  }

  return {
    breadth20,
    breadth60,
    breadth200,
    isOversoldOpportuneBuy,
    is200MaDivergenceInvalidated,
    fallbackIndicator,
    interpretationHeadline,
    actionGuidance,
  };
}

/**
 * 3. 融資去槓桿比率精算
 */
export function evaluateMarginDeleveraging(params: {
  indexDrawdownPercent: number;
  marginDrawdownPercent: number;
}): MarginDeleveragingStatus {
  const { indexDrawdownPercent, marginDrawdownPercent } = params;

  const idxDrop = Math.abs(indexDrawdownPercent);
  const mrgDrop = Math.abs(marginDrawdownPercent);

  const ratio = idxDrop > 0 ? Number((mrgDrop / idxDrop).toFixed(2)) : 1.0;
  const isDeleveragingSufficient = ratio >= 1.0 && marginDrawdownPercent < 0;

  let statusText = '融資去槓桿健康度正常';
  if (isDeleveragingSufficient) {
    statusText = `融資減幅 (${marginDrawdownPercent.toFixed(1)}%) 超過大盤跌幅 (${indexDrawdownPercent.toFixed(1)}%)，去槓桿清洗充分 (比率 ${ratio})。`;
  } else if (indexDrawdownPercent < -5.0 && ratio < 0.8) {
    statusText = `大盤跌幅顯著但融資減幅落後 (比率 ${ratio})，散戶尚未認賠，浮額仍待沉澱。`;
  }

  return {
    asOfDate: new Date().toISOString().slice(0, 10),
    indexDrawdownPercent,
    marginDrawdownPercent,
    marginDeleveragingRatio: ratio,
    isDeleveragingSufficient,
    statusText,
  };
}

/**
 * 4. 中期修正落底核對表
 */
export function evaluateBottomingChecklist(params: {
  marginStatus: MarginDeleveragingStatus;
  breadth20: number;
  isAtBollingerLowerBand: boolean;
  isBadNewsDivergenceObserved: boolean;
}): BottomingChecklistResult {
  const {
    marginStatus,
    breadth20,
    isAtBollingerLowerBand,
    isBadNewsDivergenceObserved,
  } = params;

  const checklist: BottomingChecklistItem[] = [
    {
      id: 'deleveraging',
      label: '融資去槓桿充分度',
      isSatisfied: marginStatus.isDeleveragingSufficient,
      actualValueDescription: `融資減幅/跌幅比率 ${marginStatus.marginDeleveragingRatio}`,
      thresholdDescription: '比率 >= 1.0 且融資實質下降',
    },
    {
      id: 'bollinger',
      label: '季線/年線布林通道下軌位階',
      isSatisfied: isAtBollingerLowerBand,
      actualValueDescription: isAtBollingerLowerBand ? '觸及通道下軌或跌破後收斂' : '未達通道下緣',
      thresholdDescription: '加權指數回測布林通道下軌',
    },
    {
      id: 'breadth_oversold',
      label: '全市場 20MA 寬度極度超賣',
      isSatisfied: breadth20 < 20.0,
      actualValueDescription: `${breadth20.toFixed(1)}%`,
      thresholdDescription: '< 20.0%',
    },
    {
      id: 'bad_news_divergence',
      label: '恐慌利空鈍化不破底',
      isSatisfied: isBadNewsDivergenceObserved,
      actualValueDescription: isBadNewsDivergenceObserved ? '利空出盡，指數止跌反彈' : '持續破底創低',
      thresholdDescription: '利空襲擊指數不再破底',
    },
  ];

  const satisfiedCount = checklist.filter((c) => c.isSatisfied).length;
  const totalCount = checklist.length;
  const bottomingReadinessScore = Math.round((satisfiedCount / totalCount) * 100);

  let verdict: 'NOT_BOTTOMED' | 'DEVELOPING' | 'BOTTOM_SIGNAL_CONFIRMED' = 'NOT_BOTTOMED';
  let guidanceText = '落底訊號尚未成形，保持觀望與現金彈性。';

  if (satisfiedCount >= 3) {
    verdict = 'BOTTOM_SIGNAL_CONFIRMED';
    guidanceText = '落底要件已高度齊備，浮額清洗充分且結構超賣，為中期修正之極佳分批佈局點。';
  } else if (satisfiedCount >= 2) {
    verdict = 'DEVELOPING';
    guidanceText = '落底特徵正在醞釀，切勿恐慌殺低，耐心等待最後一個確認訊號。';
  }

  return {
    checklist,
    satisfiedCount,
    totalCount,
    bottomingReadinessScore,
    verdict,
    guidanceText,
  };
}

/**
 * 5. A 軌波段調節與個人風險預算決策 (整合既有 rebalancingEngine 質押還款與四階減碼瀑布流)
 */
export function generateTrackADecision(params: {
  cyclePhase: WaveBusinessCyclePhase;
  maxDrawdownTolerancePercent: number; // 個人最大可承受回撤 (如 20%)
  stressScenarioDrawdownPercent?: number; // 壓力情境跌幅 (如 30%)
  currentEquityWeightPercent?: number;
  holdings: HoldingPosition[];
  cashBalanceTwd?: number;
  usdToTwdRate?: number;
  loans?: LoanRecord[];
}): TrackADecision & {
  currentEquityWeightPercent: number;
  debtRepaymentSummary?: string;
  activeLoanPrincipalTwd?: number;
} {
  const {
    cyclePhase,
    maxDrawdownTolerancePercent,
    stressScenarioDrawdownPercent = 30,
    currentEquityWeightPercent: explicitEquityWeight,
    holdings,
    cashBalanceTwd = 0,
    usdToTwdRate = 32,
    loans = [],
  } = params;

  // 1. 週期建議持股水位範圍
  let recommendedRange: [number, number] = [80, 85];
  let actionSummary = '製造業擴張期，維持 80%~85% 積極持股水位。';

  switch (cyclePhase) {
    case 'RECOVERY':
      recommendedRange = [85, 95];
      actionSummary = '復甦初期，積極提高股票曝險至 85%~95%。';
      break;
    case 'EXPANSION':
    case 'BOOM_MID':
      recommendedRange = [80, 85];
      actionSummary = '榮景擴張期，維持 80%~85% 核心持股。';
      break;
    case 'BOOM_LATE':
      recommendedRange = [70, 75];
      actionSummary = '榮景末升段，預防性微調至 70%~75%，回收過熱投機部位。';
      break;
    case 'MID_CYCLE_SLOWDOWN':
      recommendedRange = [65, 75];
      actionSummary = '中期趨緩期，持股降至 65%~75%（最多調節 1/3），保留防彈衣。';
      break;
    case 'RECESSION':
      recommendedRange = [25, 40];
      actionSummary = '實質衰退期，股票降至 25%~40%，防彈衣與現金轉為主力。';
      break;
  }

  const recommendedMid = (recommendedRange[0] + recommendedRange[1]) / 2;

  // 2. 個人風險預算反推上限: 可承受帳面回撤 / 壓力情境跌幅
  const stressDrop = Math.max(1, stressScenarioDrawdownPercent);
  const riskBudgetMaxEquity = Number(((maxDrawdownTolerancePercent / stressDrop) * 100).toFixed(1));

  // 3. 最終持股建議取週期水位與個人風險預算之極小值
  const finalSuggested = Number(Math.min(recommendedMid, riskBudgetMaxEquity).toFixed(1));

  // 4. 呼叫既有 rebalancingEngine 取得真實質押與資產大類計畫
  let activeLoanPrincipalTwd = 0;
  const pledgedSharesMap: Record<string, number> = {};
  if (Array.isArray(loans)) {
    for (const l of loans) {
      if (l.principal && l.principal > 0) {
        activeLoanPrincipalTwd += l.principal;
      }
      if (l.pledgedCollateral && Array.isArray(l.pledgedCollateral)) {
        for (const col of l.pledgedCollateral) {
          if (col.symbol && col.shares) {
            const sym = col.symbol.toUpperCase();
            pledgedSharesMap[sym] = (pledgedSharesMap[sym] || 0) + col.shares;
          }
        }
      }
    }
  }

  const standardConfig: TargetAllocationConfig = {
    id: 'zavy_track_a_standard',
    name: '慢富標準雙軌配置',
    type: 'ASSET_CLASS',
    updatedAt: Date.now(),
    toleranceBandPercent: 5.0,
    items: [
      { key: 'EQUITY', name: '股票資產', targetPercent: finalSuggested },
      { key: 'BOND_GOV', name: '純公債防彈衣', targetPercent: Math.max(0, 100 - finalSuggested) },
    ],
  };

  const rebalancePlan = calculateAssetClassRebalancePlan({
    config: standardConfig,
    holdings,
    cashBalanceTwd,
    usdToTwdRate,
    activeLoanPrincipalTwd,
    pledgedSharesMap,
  });

  const equityRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'EQUITY');
  const actualEquityPercent =
    typeof explicitEquityWeight === 'number'
      ? explicitEquityWeight
      : (equityRec?.currentPercent ?? 0);

  // 5. 四階減碼候選名單 (優先對齊 rebalancingEngine 的 waterfallSellSuggestions)
  const tier1SellCandidates: string[] = [];
  const tier2SellCandidates: string[] = [];
  const tier3PreservedCandidates: string[] = [];
  const tier4CoreHoldings: string[] = [];

  if (rebalancePlan.waterfallSellSuggestions && rebalancePlan.waterfallSellSuggestions.length > 0) {
    for (const item of rebalancePlan.waterfallSellSuggestions) {
      const pledgedTag = item.isPledged ? ' 🔒[設質鎖定]' : '';
      const label = `${item.symbol} ${item.name}${pledgedTag}`;
      if (item.tier === 1) tier1SellCandidates.push(label);
      else if (item.tier === 2) tier2SellCandidates.push(label);
      else if (item.tier === 3) tier3PreservedCandidates.push(label);
      else tier4CoreHoldings.push(label);
    }
  } else {
    for (const h of holdings) {
      const cls = classifyZavyAssetClass(h);
      if (cls.category !== 'EQUITY') continue;
      const isPledged = (pledgedSharesMap[h.symbol.toUpperCase()] || 0) > 0;
      const label = `${h.symbol} ${h.name}${isPledged ? ' 🔒[設質鎖定]' : ''}`;

      if (cls.subCategory === 'EQUITY_SATELLITE' || cls.isExcluded) {
        tier1SellCandidates.push(label);
      } else if (cls.subCategory === 'EQUITY_DIVIDEND') {
        tier3PreservedCandidates.push(label);
      } else if (cls.subCategory === 'EQUITY_CORE') {
        tier4CoreHoldings.push(label);
      } else {
        tier2SellCandidates.push(label);
      }
    }
  }

  const debtSummary =
    rebalancePlan.debtRepayment && rebalancePlan.debtRepayment.hasActiveLoans
      ? `目前質押借款總額為 $${rebalancePlan.debtRepayment.totalLoanPrincipalTwd.toLocaleString()}，${rebalancePlan.debtRepayment.rationale}`
      : undefined;

  return {
    cyclePhase,
    recommendedEquityWeightRange: recommendedRange,
    recommendedEquityWeightMid: recommendedMid,
    maxDrawdownTolerancePercent,
    stressScenarioDrawdownPercent: stressDrop,
    riskBudgetMaxEquityExposurePercent: riskBudgetMaxEquity,
    finalSuggestedEquityExposurePercent: finalSuggested,
    recommendedActionSummary: actionSummary,
    currentEquityWeightPercent: actualEquityPercent,
    debtRepaymentSummary: debtSummary,
    activeLoanPrincipalTwd,
    sellWaterfallPreview: {
      tier1SellCandidates,
      tier2SellCandidates,
      tier3PreservedCandidates,
      tier4CoreHoldings,
    },
  };
}

/**
 * 6. B 軌多資產配置與再平衡決策 (整合既有 rebalancingEngine 股息活水與 monteCarloFireEngine 30x FIRE)
 */
export function generateTrackBDecision(params: {
  holdings: HoldingPosition[];
  cashBalanceTwd: number;
  usdToTwdRate?: number;
  annualExpenditureTargetTwd?: number;
  annualEstimatedDividendsTwd?: number;
  userAge?: number;
  targetRetirementAge?: number;
  loans?: LoanRecord[];
}): TrackBDecision & {
  srrRiskReductionPercent?: number;
  equityOnlyExhaustionRate?: number;
  shieldedExhaustionRate?: number;
  dividendRedirectDetails?: Array<{ targetCategory: string; allocationPercent: number; amountTwd: number }>;
} {
  const {
    holdings,
    cashBalanceTwd,
    usdToTwdRate = 32,
    annualExpenditureTargetTwd = 600000,
    annualEstimatedDividendsTwd = 0,
    userAge,
    targetRetirementAge,
    loans = [],
  } = params;

  // 1. 慢富基準配置: 60/20/10/10 (股票 60%, 純公債 20%, 黃金 10%, 現金 10%)
  const targetAllocation = {
    equityPercent: 60,
    govBondPercent: 20,
    goldPercent: 10,
    cashPercent: 10,
  };

  const standardConfig: TargetAllocationConfig = {
    id: 'zavy_track_b_standard',
    name: '慢富標準雙軌配置',
    type: 'ASSET_CLASS',
    updatedAt: Date.now(),
    toleranceBandPercent: 5.0,
    items: [
      { key: 'EQUITY', name: '股票資產', targetPercent: targetAllocation.equityPercent },
      { key: 'BOND_GOV', name: '純公債防彈衣', targetPercent: targetAllocation.govBondPercent },
      { key: 'GOLD', name: '黃金儲備', targetPercent: targetAllocation.goldPercent },
      { key: 'CASH', name: '現金防護網', targetPercent: targetAllocation.cashPercent },
    ],
  };

  let activeLoanPrincipalTwd = 0;
  if (Array.isArray(loans)) {
    for (const l of loans) {
      if (l.principal && l.principal > 0) {
        activeLoanPrincipalTwd += l.principal;
      }
    }
  }

  // 2. 呼叫既有 rebalancingEngine
  const rebalancePlan = calculateAssetClassRebalancePlan({
    config: standardConfig,
    holdings,
    cashBalanceTwd,
    usdToTwdRate,
    annualEstimatedDividendsTwd,
    activeLoanPrincipalTwd,
  });

  const totalNav = rebalancePlan.totalPortfolioValueTwd;

  const equityRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'EQUITY');
  const govBondRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'BOND_GOV');
  const corpBondRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'BOND_CORP_IG');
  const goldRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'GOLD');
  const reitsRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'REITS');
  const cashRec = rebalancePlan.assetClassRecommendations.find((r) => r.key === 'CASH');

  const currentAllocation = {
    equityPercent: equityRec?.currentPercent ?? 0,
    govBondPercent: govBondRec?.currentPercent ?? 0,
    corpBondPercent: corpBondRec?.currentPercent ?? 0,
    goldPercent: goldRec?.currentPercent ?? 0,
    reitsPercent: reitsRec?.currentPercent ?? 0,
    cashPercent: cashRec?.currentPercent ?? 0,
  };

  const isRebalanceRecommended = rebalancePlan.assetClassRecommendations.some((r) => r.status !== 'BALANCED');
  const rebalanceTriggerReason = isRebalanceRecommended
    ? `股票資產實際佔比 (${currentAllocation.equityPercent}%) 偏離目標 (60%) 超過 ±5% 閾值。`
    : undefined;

  // 3. 呼叫既有 monteCarloFireEngine 精算 30x 本金與順序風險 (SRR)
  const fireMetrics = calculateSlowWealthFireMetrics({
    currentNetWorthTwd: totalNav,
    annualExpenditureTargetTwd,
    currentAge: userAge,
    targetRetirementAge,
  });

  const dividendRedirectDetails = rebalancePlan.dividendRedirectPlan?.targets?.map((item) => ({
    targetCategory: item.category,
    allocationPercent: item.allocationPercent,
    amountTwd: item.allocatedAmountTwd,
  }));

  const dividendPlanSummary = rebalancePlan.dividendRedirectPlan?.guidanceMessage ||
    '建議將每年股息現金活水優先注入純公債 (00687B) 與黃金 (00635U)。';

  return {
    currentAssetAllocation: currentAllocation,
    targetAllocation,
    isRebalanceRecommended,
    rebalanceTriggerReason,
    dividendRedirectPlanSummary: dividendPlanSummary,
    dividendRedirectDetails,
    fire30xStatus: {
      targetCapital30xTwd: fireMetrics.targetCapital30xTwd,
      currentProgressPercent: fireMetrics.currentProgressPercent,
      isCoastFireAchieved: fireMetrics.isCoastFireAchieved,
    },
    srrRiskReductionPercent: fireMetrics.srrRiskReductionPercent,
    equityOnlyExhaustionRate: fireMetrics.equityOnlyScenario.exhaustionRateBeforeYear10,
    shieldedExhaustionRate: fireMetrics.shieldedAssetScenario.exhaustionRateBeforeYear10,
  };
}

/**
 * 7. 彙整產出 Zavy 全景交付報告 (含 10 秒即食摘要，100% 真實數據連通)
 */
export function generateZavyAnalysisReport(params: {
  snapshot: MacroIndicatorSnapshot;
  breadth: MultiHorizonMarketBreadth;
  marginStatus: MarginDeleveragingStatus;
  holdings: HoldingPosition[];
  cashBalanceTwd: number;
  usdToTwdRate?: number;
  loans?: LoanRecord[];
  annualEstimatedDividendsTwd?: number;
  isAtBollingerLowerBand?: boolean;
  isBadNewsDivergenceObserved?: boolean;
  stressScenarioDrawdownPercent?: number;
  maxDrawdownTolerancePercent?: number;
  targetAnnualExpenseTwd?: number;
  userAge?: number;
  targetRetirementAge?: number;
  isDecadeMovingAverageBroken?: boolean;
}): ZavyComprehensiveAnalysisReport {
  const {
    snapshot,
    breadth,
    marginStatus,
    holdings,
    cashBalanceTwd,
    usdToTwdRate = 32,
    loans = [],
    annualEstimatedDividendsTwd = 0,
    isAtBollingerLowerBand = false,
    isBadNewsDivergenceObserved = false,
    stressScenarioDrawdownPercent = 30,
    maxDrawdownTolerancePercent = 20,
    targetAnnualExpenseTwd = 600000,
    userAge,
    targetRetirementAge,
    isDecadeMovingAverageBroken = false,
  } = params;

  const macroCompass = evaluateMacroCompass(snapshot);
  const interpretation = evaluateCycleCoupledBreadth(breadth, macroCompass.wave.phase, isDecadeMovingAverageBroken);
  const bottomingChecklist = evaluateBottomingChecklist({
    marginStatus,
    breadth20: breadth.breadth20,
    isAtBollingerLowerBand,
    isBadNewsDivergenceObserved,
  });

  const trackA = generateTrackADecision({
    cyclePhase: macroCompass.wave.phase,
    maxDrawdownTolerancePercent,
    stressScenarioDrawdownPercent,
    holdings,
    cashBalanceTwd,
    usdToTwdRate,
    loans,
  });

  const trackB = generateTrackBDecision({
    holdings,
    cashBalanceTwd,
    usdToTwdRate,
    annualExpenditureTargetTwd: targetAnnualExpenseTwd,
    annualEstimatedDividendsTwd,
    userAge,
    targetRetirementAge,
    loans,
  });

  const tenSecondsExecutiveSummary: string[] = [
    `【總經羅盤】製造業處於「${macroCompass.wave.cycleSummary}」，10Y 美債處於「${macroCompass.tidal.treasury10yNewNormalStatus}」新常態區間。`,
    `【結構寬度】台股 20MA 寬度為 ${breadth.breadth20.toFixed(1)}%，${interpretation.interpretationHeadline}。`,
    `【A 軌建議】建議股票曝險上限為 ${trackA.finalSuggestedEquityExposurePercent}% (當前持股佔比 ${trackA.currentEquityWeightPercent}%)。`,
    `【B 軌配置】當前股債金比重為 ${trackB.currentAssetAllocation.equityPercent}% / ${trackB.currentAssetAllocation.govBondPercent}% / ${trackB.currentAssetAllocation.goldPercent}%，${trackB.isRebalanceRecommended ? '已觸發再平衡警戒' : '資產結構均衡'}。`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    macroCompass,
    marketBreadth: {
      tw: breadth,
      marginDeleveraging: marginStatus,
      interpretation,
      bottomingChecklist,
    },
    trackA,
    trackB,
    tenSecondsExecutiveSummary,
  };
}

/**
 * 8. 導出 Markdown 完整交接報告
 */
export function exportZavyReportMarkdown(report: ZavyComprehensiveAnalysisReport): string {
  const { generatedAt, macroCompass, marketBreadth, trackA, trackB, tenSecondsExecutiveSummary } = report;

  return `# Zavy 台美股總經三級週期定位與 A/B 雙軌配置報告
> 生成時間：${generatedAt}
> 核心哲學：大局觀 · 不對漣漪起反應 · 見自己 · 把路走完

---

## ⚡ 10 秒即食摘要 (Executive Summary)
${tenSecondsExecutiveSummary.map((s) => `- ${s}`).join('\n')}

---

## 🧭 第一層：總體經濟與三級週期定位
- **潮汐大週期 (Tidal)**：${macroCompass.tidal.regime}
  - 10 年美債殖利率位階：${macroCompass.tidal.treasury10yNewNormalStatus}
  - 敘事與大局觀：${macroCompass.tidal.narrative}
- **波浪商業週期 (Wave)**：${macroCompass.wave.phase} (信心度 ${macroCompass.wave.confidenceScore}%)
  - 週期現況：${macroCompass.wave.cycleSummary}
  - 美台大卡車 vs 小車：${macroCompass.wave.smallTruckVsBigTruckStatus.commentary}
- **信用裂痕雷達**：風險等級【${macroCompass.creditRadar.creditRiskLevel}】
  - OAS 利差過熱警戒：${macroCompass.creditRadar.isOasOverheatedLow ? '⚠️ 是 (<=3.5%)' : '否'}
  - CCC 垃圾債利差走闊：${macroCompass.creditRadar.hasEarlyCccStress ? '⚠️ 是' : '否'}
  ${macroCompass.creditRadar.warningMessage ? `> ${macroCompass.creditRadar.warningMessage}` : ''}

---

## 📊 第二層：台美市場結構、寬度與去槓桿
- **台股市場寬度 (Market Breadth)**：
  - 20MA 站上比例：${marketBreadth.tw.breadth20.toFixed(1)}%
  - 60MA 站上比例：${marketBreadth.tw.breadth60.toFixed(1)}%
  - 200MA 站上比例：${marketBreadth.tw.breadth200.toFixed(1)}%
  - 週期情境耦合解讀：**${marketBreadth.interpretation.interpretationHeadline}**
  - 操作指引：${marketBreadth.interpretation.actionGuidance}
- **融資去槓桿比率 (Margin Deleveraging)**：
  - 指數波段回撤：${marketBreadth.marginDeleveraging.indexDrawdownPercent.toFixed(1)}%
  - 融資餘額減幅：${marketBreadth.marginDeleveraging.marginDrawdownPercent.toFixed(1)}%
  - 去槓桿比率：${marketBreadth.marginDeleveraging.marginDeleveragingRatio} (${marketBreadth.marginDeleveraging.statusText})
- **中期修正落底核對表 (Bottoming Checklist)**：
  - 就緒度得分：${marketBreadth.bottomingChecklist.bottomingReadinessScore} / 100 (${marketBreadth.bottomingChecklist.verdict})
  - 結論指引：${marketBreadth.bottomingChecklist.guidanceText}
${marketBreadth.bottomingChecklist.checklist.map((c) => `  - [${c.isSatisfied ? 'x' : ' '}] ${c.label}：${c.actualValueDescription} (門檻：${c.thresholdDescription})`).join('\n')}

---

## 🎯 第三層：A/B 雙軌決策與個人風險預算

### 【A 軌：中期製造業週期波段調節 (市場紀要模式)】
- 週期建議持股範圍：${trackA.recommendedEquityWeightRange[0]}% ~ ${trackA.recommendedEquityWeightRange[1]}%
- 個人最大可承受帳面回撤：${trackA.maxDrawdownTolerancePercent}% (壓力情境跌幅 ${trackA.stressScenarioDrawdownPercent}%)
- 個人風險預算反推上限：${trackA.riskBudgetMaxEquityExposurePercent}%
- **最終建議持股曝險：${trackA.finalSuggestedEquityExposurePercent}%**
- 調節指引：${trackA.recommendedActionSummary}
- **四階減碼瀑布流**：
  - Tier 1 波段/衛星優先出清：${trackA.sellWaterfallPreview.tier1SellCandidates.join('、') || '無'}
  - Tier 2 主題型/次核心：${trackA.sellWaterfallPreview.tier2SellCandidates.join('、') || '無'}
  - Tier 3 高股息存量保護：${trackA.sellWaterfallPreview.tier3PreservedCandidates.join('、') || '無'}
  - Tier 4 核心底倉最後防線：${trackA.sellWaterfallPreview.tier4CoreHoldings.join('、') || '無'}

### 【B 軌：長期多資產配置與再平衡 (慢富配置模式)】
- 當前資產配置比重：
  - 股票：${trackB.currentAssetAllocation.equityPercent}% (目標 ${trackB.targetAllocation.equityPercent}%)
  - 純公債：${trackB.currentAssetAllocation.govBondPercent}% (目標 ${trackB.targetAllocation.govBondPercent}%)
  - 黃金：${trackB.currentAssetAllocation.goldPercent}% (目標 ${trackB.targetAllocation.goldPercent}%)
  - 現金：${trackB.currentAssetAllocation.cashPercent}% (目標 ${trackB.targetAllocation.cashPercent}%)
- 再平衡判定：${trackB.isRebalanceRecommended ? `⚠️ 建議啟動再平衡 (${trackB.rebalanceTriggerReason})` : '✅ 處於均衡區間'}
- 股息活水轉向指引：${trackB.dividendRedirectPlanSummary}
- 30 倍退休進度：達成率 ${trackB.fire30xStatus.currentProgressPercent}% (Coast-FIRE: ${trackB.fire30xStatus.isCoastFireAchieved ? '已達標' : '進行中'})
`;
}

/**
 * 9. 導出 CSV 原始總經與指標數據
 */
export function exportZavyRawDataCsv(snapshot: MacroIndicatorSnapshot, breadth: MultiHorizonMarketBreadth): string {
  const rows = [
    ['MetricKey', 'MetricName', 'Value', 'Unit', 'AsOfDate'],
    ['us_ism_pmi', '美國 ISM 製造業 PMI', snapshot.usIsmPmi ?? '', '指數', breadth.asOfDate],
    ['us_new_orders_minus_inv', '美國新訂單減客戶庫存', snapshot.usNewOrdersMinusInventory ?? '', '點', breadth.asOfDate],
    ['tw_pmi', '台灣製造業 PMI', snapshot.twPmi ?? '', '指數', breadth.asOfDate],
    ['tw_export_orders_yoy', '台灣外銷訂單年增率', snapshot.twExportOrdersYoY ?? '', '%', breadth.asOfDate],
    ['treasury_yield_10y', '美國 10 年期公債殖利率', snapshot.treasuryYield10y ?? '', '%', breadth.asOfDate],
    ['treasury_yield_2y', '美國 2 年期公債殖利率', snapshot.treasuryYield2y ?? '', '%', breadth.asOfDate],
    ['yield_spread_10y2y', '10Y-2Y 殖利率利差', snapshot.yieldSpread10y2y ?? '', '%', breadth.asOfDate],
    ['high_yield_spread_oas', '美國高收益債利差 OAS', snapshot.highYieldSpreadOas ?? '', '%', breadth.asOfDate],
    ['ccc_high_yield_spread', 'CCC 級高收益債利差', snapshot.cccHighYieldSpread ?? '', '%', breadth.asOfDate],
    ['tw_breadth_20ma', '台股站上 20MA 寬度', breadth.breadth20 ?? '', '%', breadth.asOfDate],
    ['tw_breadth_60ma', '台股站上 60MA 寬度', breadth.breadth60 ?? '', '%', breadth.asOfDate],
    ['tw_breadth_200ma', '台股站上 200MA 寬度', breadth.breadth200 ?? '', '%', breadth.asOfDate],
  ];

  return rows.map((r) => r.join(',')).join('\n');
}

