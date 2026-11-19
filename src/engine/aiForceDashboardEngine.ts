import { MarketType } from '../types/stock';
import {
  AiForceDashboardReport,
  InstitutionalFlowData,
  BullBearEnergyData,
  HealthSummaryData,
  DynamicSignalsData,
  ForceDistributionData,
  BullBearStrengthData,
  KlineCandleItem,
  TdccDistributionData,
  Us13fChipData,
  MonthlyRevenueData,
} from '../types/aiForceDashboard';
import { calculateVolumeProfile } from './volumeProfileEngine';
import { calculateRiskSpider } from './riskSpiderEngine';
import { calculateForecastCone } from './forecastConeEngine';
import { calculateVwapCostStructure, DEFAULT_TIME_NODES } from './vwapCostEngine';
import { calculateDayTradeRisk } from './dayTradeRiskEngine';
import {
  calculateMultiDimensionRadar,
  calculateUsMicrostructureInstitutionalScore,
} from './multiDimensionRadarEngine';
import { estimateMarketSentiment } from './marketSentimentEngine';
import { calculateAiConfidence } from './aiConfidenceEngine';
import { getMarketSettlementStatus, formatDateToYMD } from './marketSettlementEngine';
import { synthesizeMainForceVerdict } from './mainForceSemanticEngine';
import { isCanonicalEtfSymbol } from './assetClassifier';

export {
  calculateVolumeProfile,
  calculateRiskSpider,
  calculateForecastCone,
  calculateVwapCostStructure,
  calculateDayTradeRisk,
  calculateMultiDimensionRadar,
  calculateUsMicrostructureInstitutionalScore,
  estimateMarketSentiment,
  calculateAiConfidence,
  synthesizeMainForceVerdict,
};

/**
 * 建立具備合理預設值的 AiForceDashboardReport
 */
export function createDefaultAiForceReport(
  symbol: string = '0050',
  name: string = '元大台灣50',
  market: MarketType = 'TW',
  basePrice?: number,
  referenceDate: Date = new Date()
): AiForceDashboardReport {
  const settlement = getMarketSettlementStatus(market, referenceDate);
  const todayStr = settlement.anchorTradingDate;
  const isUs = market === 'US';
  const isEtf = isEtfSymbol(symbol, name, market);

  // ARINC 661 Zero-Mock 硬閘門 (Spec 0239 T09): 無歷史日 K 一律維持待命態，絕不捏造假 OHLC 或假分數
  const isDataPending = true;
  const price: number | undefined = basePrice !== undefined && basePrice > 0 ? basePrice : undefined;

  return {
    symbol,
    name,
    market,
    updatedAt: todayStr,
    activeTaskTab: 'TASK_1_COMPREHENSIVE',
    isDataPending,

    marketBar: {
      currentPrice: price,
      change: undefined,
      changePercent: undefined,
      volumeShares: undefined,
      transactionCount: undefined,
      openPrice: undefined,
      highPrice: undefined,
      lowPrice: undefined,
      latestTradingDate: settlement.anchorTradingDate,
      dataPointsCount: 0,
      dataSourceText: isUs ? 'Yahoo Finance' : '日 K TWSE | 法人 TWSE | 融資券 FinMind',
      dataRangeText: '尚無歷史交易日資料',
      isSettled: settlement.isSettled,
      anchorTradingDate: settlement.anchorTradingDate,
      settlementReason: settlement.reason,
      currency: isUs ? 'USD' : 'TWD',
      volumeUnit: isUs ? '股' : '張',
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: false,
        marketStatus: 'NORMAL',
        volatilityAlert: false,
      },
    },

    klineSystem: {
      candles: [],
      keyLevels: {
        highResistance: 0,
        mainForceCost: 0,
        supportLevel: 0,
      },
    },

    decisionCore: {
      warningBadgeText: 'AI STANDBY',
      trendJudgement: '資料累積中',
      shortTermState: '待命',
      mainForceAction: '待命觀望',
      chipStructure: isUs ? '量價待補' : '籌碼待補',
      dayTradeRiskPercent: 0,
      chipHealthScore: 0,
      chipHealthLabel: '待評估',
      supportRange: [0, 0],
      resistanceRange: [0, 0],
      riskHorizonDays: '1~4 個交易日',
    },

    multiDimensionRadar: {
      overallScore: 0,
      overallGrade: 'D',
      dimensions: {
        institutional: 0,
        trend: 0,
        chips: 0,
        liquidity: 0,
        volatility: 0,
        momentum: 0,
      },
    },

    volumeProfile: {
      buckets: [],
      priceTicks: [],
      heatmapColumns: [],
      bullBearFooterTag: '尚無量價分佈',
    },

    riskSpider: {
      liquidityRisk: 0,
      volatilityRisk: 0,
      trendRisk: 0,
      institutionalRisk: 0,
      chipRisk: 0,
      mainForceRiskLevel: 'LOW',
      mainForceRiskIndex: 0,
    },

    forecastCone: {
      bullishProb: 0,
      rangeProb: 0,
      bearishProb: 0,
      mainForceDirectionProb: 0,
      annualizedDriftPercent: 0,
      timeNodes: [],
    },

    vwapCostStructure: {
      mainForceVwap: 0,
      biasPercent: 0,
      bands: [],
      timeNodes: DEFAULT_TIME_NODES,
    },

    institutionalFlow: {
      history: [],
      recentDaysTable: [],
      cumulative20DaysSummary: isUs ? '美股機構量價累積中' : '尚無法人日報數據',
      recent5DaysSummary: isUs ? '待日 K 載入' : '待三大法人公布',
      isUsMarket: isUs,
    },

    dayTradeRisk: {
      abnormalSelling: 0,
      turnoverRate: 0,
      dayTradeRatio: 0,
      pullbackRisk: 0,
      intradayVolatility: 0,
      riskLevel: 'LOW',
      riskIndex: 0,
      isUsMarket: isUs,
    },

    bullBearEnergy: {
      bullEnergyPercent: 50,
      bearEnergyPercent: 50,
      bullBearRatio: 1,
      bullBearConclusion: '待命',
      noteText: '(尚無 20 日量能資料)',
    },

    healthSummary: {
      chipHealth: 0,
      technicalStructure: 0,
      capitalMomentum: 0,
      liquidityRisk: 0,
      institutionalSupport: 0,
      overallRatingLabel: '待評估 (尚無完整日 K)',
    },

    dynamicSignals: {
      trendSignal: '資料累積中',
      chipSignal: isUs ? '量價待補' : '籌碼待補',
      momentumSignal: '待評估',
      riskSignal: '風險待評估',
      verdictLight: 'YELLOW',
      verdictLabel: '黃燈 (資料待命)',
      compositeScore: 0,
    },

    marketSentiment: {
      overallSentimentIndex: 50,
      sentimentState: 'NEUTRAL',
      retailSentimentPercent: 50,
      institutionalSentimentPercent: 50,
      mainForceSentimentPercent: 50,
      isUsMarket: isUs,
    },

    aiConfidence: {
      overallConfidence: 0,
      modelAccuracy: 0,
      dataCompleteness: 0,
      signalStability: 0,
      strategyApplicability: 0,
    },

    chipsSummary: {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      threeInstitutionsTotal: 0,
      verdictNote: isUs ? `${todayStr} 美股量價數據累積中` : `${todayStr} 尚無法人日報數據`,
      conclusionBadge: isUs ? '量價待補' : '籌碼待補',
      sparklineHistory: [],
      isUsMarket: isUs,
    },

    forceDistribution: {
      largePlayerBuyPercent: 50,
      retailBuyPercent: 50,
      retailSellPressurePercent: 50,
      asOfDateText: isUs ? `${todayStr} (尚無美股量價資料)` : `${todayStr} (尚無法人買賣力資料)`,
      isUsMarket: isUs,
    },

    bullBearStrength: {
      bullStrengthPercent: 50,
      bearStrengthPercent: 50,
      volumeStrengthPercent: 0,
      signalTierLevel: 3,
      compositeScore: 0,
    },

    mainForceVerdict: {
      primaryVerb: '待命觀望',
      semanticTag: isUs ? '機構量價' : '法人動作',
      fullVerdictText: '尚無足夠歷史交易日資料（需至少 5 日 K 線）以進行主力行為研判。',
      isUsMarket: isUs,
    },

    tdccDistribution: {
      symbol,
      isUsMarket: isUs,
      history: [],
      concentrationBadge: isUs ? '13F 數據待補' : '集保待補',
      asOfDateText: isUs ? '美股市場' : '集保無資料',
      isEmpty: true,
      emptyMessage: isUs ? '美股無集保機制 (採 13F 機構申報)' : '集保數據累積中 (週五盤後結算)',
    },

    monthlyRevenue: {
      isEtf,
      isUsMarket: isUs,
      currency: isUs ? 'USD' : 'TWD',
      history: [],
      growthBadge: isEtf ? 'ETF 資料待補' : '尚無營收',
      asOfDateText: isEtf ? 'ETF 規模與殖利率' : '營收無資料',
      isEmpty: true,
      emptyMessage: isEtf
        ? 'ETF 配息與規模資料累積中'
        : isUs
        ? '美股季度財報營收 (10-Q/10-K) 累積中'
        : '月營收數據累積中 (每月 10 日公布)',
      etfData: undefined,
    },

    valuationMetrics: {
      isEtf,
      isUsMarket: isUs,
      isEmpty: true,
      historySampleSize: 0,
      asOfDateText: todayStr,
    },
  };
}

export interface RawInstitutionalRecord {
  date: string;
  foreignShares: number;
  trustShares: number;
  dealerShares: number;
  sblBalance?: number;
}

/**
 * 單一權威資產型態判定 (委託 assetClassifier.ts，Spec 0239 T02/T08)
 */
export function isEtfSymbol(
  symbol: string,
  name?: string,
  market?: MarketType,
  metaType?: string
): boolean {
  return isCanonicalEtfSymbol(symbol, name, market, metaType);
}

/**
 * 依據本地 SQLite tw_tdcc_distribution 建立 Card 19「TDCC 集保千張大戶趨勢」資料 (Spec 0169)
 */
export function buildTdccDistribution(
  records?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>,
  market: MarketType = 'TW',
  symbol?: string,
  us13fData?: Us13fChipData
): TdccDistributionData {
  if (market === 'US') {
    if (us13fData) {
      const isSqueeze = us13fData.isSqueezeRisk ?? ((us13fData.shortFloatRatio ?? 0) > 10);
      const isConcentrated = (us13fData.institutionalRatio ?? 0) > 60;
      return {
        symbol,
        isUsMarket: true,
        us13fData: {
          ...us13fData,
          isSqueezeRisk: isSqueeze,
        },
        history: [],
        concentrationBadge: isSqueeze
          ? '軋空警戒 (Squeeze Alert)'
          : isConcentrated
          ? '機構高度控盤'
          : '籌碼正常分散',
        asOfDateText: us13fData.asOfQuarterText || 'SEC 13F 最新申報',
        isEmpty: false,
      };
    }
    return {
      symbol,
      isUsMarket: true,
      history: [],
      concentrationBadge: '美股不適用',
      asOfDateText: '美股市場',
      isEmpty: true,
      emptyMessage: '美股無集保機制 (採 13F 機構申報)',
    };
  }

  if (!records || records.length === 0) {
    return {
      symbol,
      history: [],
      concentrationBadge: '集保待補',
      asOfDateText: '集保無資料',
      isEmpty: true,
      emptyMessage: '集保數據累積中 (週五盤後結算)',
    };
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const history = sorted.map((r) => ({
    date: r.date,
    totalShareholders: r.totalShareholders ?? (r as any).total_shareholders ?? 0,
    over1000Ratio: r.over1000Ratio ?? (r as any).over_1000_ratio ?? 0,
    over400Ratio: r.over400Ratio ?? (r as any).over_400_ratio,
    under10Ratio: r.under10Ratio ?? (r as any).under_10_ratio,
  }));

  const latest = history[history.length - 1];
  if (history.length === 1) {
    const latestUnder10Ratio = latest.under10Ratio !== undefined ? Number(latest.under10Ratio.toFixed(2)) : undefined;
    return {
      symbol,
      history,
      latestOver1000Ratio: latest.over1000Ratio,
      latestUnder10Ratio,
      latestShareholders: latest.totalShareholders,
      change4WeeksRatio: undefined,
      change4WeeksUnder10Ratio: undefined,
      change4WeeksShareholders: undefined,
      retailScissorsText: undefined,
      concentrationBadge: '首週基準建立',
      asOfDateText: `集保基準日: ${latest.date}`,
      isEmpty: false,
    };
  }

  const compareIndex = Math.max(0, history.length - 4);
  const baseline = history[compareIndex];

  const change4WeeksRatio = Number((latest.over1000Ratio - baseline.over1000Ratio).toFixed(2));
  const change4WeeksShareholders = latest.totalShareholders - baseline.totalShareholders;

  const latestUnder10Ratio = latest.under10Ratio !== undefined ? Number(latest.under10Ratio.toFixed(2)) : undefined;
  const baselineUnder10Ratio = baseline.under10Ratio;
  const change4WeeksUnder10Ratio =
    latestUnder10Ratio !== undefined && baselineUnder10Ratio !== undefined
      ? Number((latestUnder10Ratio - baselineUnder10Ratio).toFixed(2))
      : undefined;

  let retailScissorsText: string | undefined = undefined;
  if (change4WeeksRatio > 0 && change4WeeksUnder10Ratio !== undefined && change4WeeksUnder10Ratio < 0) {
    retailScissorsText = '大戶增持·散戶退場 (籌碼集中)';
  } else if (change4WeeksRatio < 0 && change4WeeksUnder10Ratio !== undefined && change4WeeksUnder10Ratio > 0) {
    retailScissorsText = '大戶調節·散戶接刀 (籌碼渙散)';
  } else if (change4WeeksRatio > 0) {
    retailScissorsText = '大戶積極增持';
  } else if (change4WeeksRatio < 0) {
    retailScissorsText = '大戶持續減碼';
  }

  let concentrationBadge = '籌碼中性整理';
  if (change4WeeksRatio > 0 && change4WeeksShareholders < 0) {
    concentrationBadge = '籌碼高度集中 (波段起漲)';
  } else if (change4WeeksRatio < 0 && change4WeeksShareholders > 0) {
    concentrationBadge = '散戶接刀警戒';
  } else if (change4WeeksRatio > 0.5) {
    concentrationBadge = '大戶持續增持';
  } else if (change4WeeksRatio < -0.5) {
    concentrationBadge = '大戶明顯調節';
  }

  return {
    symbol,
    history,
    latestOver1000Ratio: latest.over1000Ratio,
    latestUnder10Ratio,
    latestShareholders: latest.totalShareholders,
    change4WeeksRatio,
    change4WeeksUnder10Ratio,
    change4WeeksShareholders,
    retailScissorsText,
    concentrationBadge,
    asOfDateText: `集保基準日: ${latest.date}`,
    isEmpty: false,
  };
}

/**
 * 台灣與美股主流 ETF 規模 (億元/億美元) 與總費用率基準對照 (Spec 0238 Ticket 04)
 */
const ETF_BASELINE_META: Record<string, { aumBillion: number; expenseRatio: number }> = {
  '0050': { aumBillion: 4380, expenseRatio: 0.43 },
  '0056': { aumBillion: 3650, expenseRatio: 0.44 },
  '00878': { aumBillion: 3520, expenseRatio: 0.42 },
  '00919': { aumBillion: 2890, expenseRatio: 0.42 },
  '006208': { aumBillion: 1750, expenseRatio: 0.24 },
  '00713': { aumBillion: 1120, expenseRatio: 0.45 },
  '00929': { aumBillion: 2350, expenseRatio: 0.43 },
  '00940': { aumBillion: 1620, expenseRatio: 0.45 },
  '00679B': { aumBillion: 2980, expenseRatio: 0.16 },
  '00687B': { aumBillion: 2560, expenseRatio: 0.17 },
  VOO: { aumBillion: 560, expenseRatio: 0.03 },
  SPY: { aumBillion: 610, expenseRatio: 0.09 },
  QQQ: { aumBillion: 310, expenseRatio: 0.2 },
  VTI: { aumBillion: 450, expenseRatio: 0.03 },
  VT: { aumBillion: 42, expenseRatio: 0.07 },
  IVV: { aumBillion: 540, expenseRatio: 0.03 },
  SCHD: { aumBillion: 65, expenseRatio: 0.06 },
  TLT: { aumBillion: 52, expenseRatio: 0.15 },
  GLD: { aumBillion: 75, expenseRatio: 0.4 },
  SOXX: { aumBillion: 14.5, expenseRatio: 0.35 },
};

/**
 * 依據近一年歷史除權息反推 ETF/個股真實年化配息率 (%)
 */
export function deriveTrailingDividendYield(
  corporateActions?: Array<{ exDate: string; cashDividendPerShare?: number }>,
  currentPrice?: number,
  referenceDateStr?: string
): number | undefined {
  if (!corporateActions || corporateActions.length === 0 || !currentPrice || currentPrice <= 0) {
    return undefined;
  }
  const refMs = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();
  const oneYearMs = 370 * 24 * 60 * 60 * 1000;
  const recentDividends = corporateActions.filter((ca) => {
    if (typeof ca.cashDividendPerShare !== 'number' || ca.cashDividendPerShare <= 0) return false;
    const exMs = new Date(ca.exDate).getTime();
    if (Number.isNaN(exMs)) return true;
    return exMs <= refMs + 30 * 24 * 60 * 60 * 1000 && refMs - exMs <= oneYearMs;
  });
  const source = recentDividends.length > 0 ? recentDividends : corporateActions.filter((ca) => (ca.cashDividendPerShare ?? 0) > 0).slice(0, 4);
  if (source.length === 0) return undefined;
  const sumCash = source.reduce((sum, ca) => sum + (ca.cashDividendPerShare ?? 0), 0);
  if (sumCash <= 0) return undefined;
  return Number(((sumCash / currentPrice) * 100).toFixed(2));
}

/**
 * 依據本地 SQLite tw_monthly_revenue 建立 Card 20「月營收成長走勢」(含 ETF 自適應) 資料 (Spec 0169)
 */
export function buildMonthlyRevenue(
  symbol: string,
  name: string,
  market: MarketType = 'TW',
  records?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>,
  tdccRecords?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>,
  etfOptions?: {
    corporateActions?: Array<{
      exDate: string;
      paymentDate?: string;
      cashDividendPerShare?: number;
      stockDividendRatio?: number;
    }>;
    dividendYield?: number | null;
    aumBillion?: number | null;
    expenseRatio?: number | null;
    currentPrice?: number;
    referenceDateStr?: string;
    metaType?: string;
    quarterlyFinancials?: Array<{
      year: number;
      quarter: number;
      revenue?: number | null;
      periodDate?: string;
    }>;
  }
): MonthlyRevenueData {
  const isUs = market === 'US';
  const isEtf = isEtfSymbol(symbol, name, market, etfOptions?.metaType);

  if (isEtf) {
    const cleanSym = symbol.trim().toUpperCase().replace(/\.(TW|TWO|US)$/i, '');
    const latestTdcc = tdccRecords && tdccRecords.length > 0 ? tdccRecords[tdccRecords.length - 1] : undefined;
    const beneficiaries = latestTdcc?.totalShareholders;
    const derivedYield = deriveTrailingDividendYield(
      etfOptions?.corporateActions,
      etfOptions?.currentPrice,
      etfOptions?.referenceDateStr
    );
    const dividendYield =
      typeof etfOptions?.dividendYield === 'number' && Number.isFinite(etfOptions.dividendYield)
        ? etfOptions.dividendYield
        : derivedYield;
    const hasAnyDynamicEtfSignal =
      beneficiaries !== undefined ||
      dividendYield !== undefined ||
      (etfOptions?.corporateActions && etfOptions.corporateActions.length > 0) ||
      typeof etfOptions?.aumBillion === 'number' ||
      typeof etfOptions?.expenseRatio === 'number';
    const aumBillion =
      typeof etfOptions?.aumBillion === 'number' && Number.isFinite(etfOptions.aumBillion)
        ? etfOptions.aumBillion
        : hasAnyDynamicEtfSignal
        ? ETF_BASELINE_META[cleanSym]?.aumBillion
        : undefined;

    const quarterlyDividends = (etfOptions?.corporateActions ?? [])
      .filter((ca) => typeof ca.cashDividendPerShare === 'number' && ca.cashDividendPerShare > 0)
      .sort((a, b) => b.exDate.localeCompare(a.exDate))
      .slice(0, 4)
      .map((ca) => {
        const perPayoutYield =
          etfOptions?.currentPrice && etfOptions.currentPrice > 0
            ? Number(((ca.cashDividendPerShare! / etfOptions.currentPrice) * 100).toFixed(2))
            : dividendYield ?? 0;
        return {
          quarter: ca.exDate,
          amount: ca.cashDividendPerShare!,
          yieldRate: perPayoutYield,
        };
      });

    const hasRealEtfData =
      quarterlyDividends.length > 0 ||
      dividendYield !== undefined ||
      beneficiaries !== undefined ||
      aumBillion !== undefined;

    if (!hasRealEtfData) {
      return {
        isEtf: true,
        isUsMarket: isUs,
        currency: isUs ? 'USD' : 'TWD',
        history: [],
        latestRevenueText: undefined,
        growthBadge: 'ETF 資料待補',
        asOfDateText: 'ETF 規模與殖利率',
        etfData: undefined,
        isEmpty: true,
        emptyMessage: isUs ? '美股 ETF 規模與配息資料累積中' : 'ETF 配息與受益人資料累積中',
      };
    }

    const asOfDateText = latestTdcc?.date
      ? `ETF 規模與受益人 (${latestTdcc.date})`
      : isUs
      ? '美股 ETF 規模與收益分配 (USD)'
      : 'ETF 規模與殖利率';

    return {
      isEtf: true,
      isUsMarket: isUs,
      currency: isUs ? 'USD' : 'TWD',
      history: [],
      latestRevenueText: undefined,
      growthBadge: 'ETF 規模穩健',
      asOfDateText,
      etfData: {
        aumBillion,
        dividendYield,
        beneficiaries,
        quarterlyDividends,
      },
      isEmpty: false,
    };
  }

  // Spec 0239 T07: 美股個股 10-Q/10-K 近 8 季營收成長走勢
  if (isUs && Array.isArray(etfOptions?.quarterlyFinancials) && etfOptions.quarterlyFinancials.length > 0) {
    const validQ = etfOptions.quarterlyFinancials
      .filter((q) => typeof q.revenue === 'number' && Number.isFinite(q.revenue) && q.revenue > 0)
      .sort((a, b) => (a.year * 10 + a.quarter) - (b.year * 10 + b.quarter));

    if (validQ.length > 0) {
      const qMap = new Map<string, number>();
      for (const q of validQ) {
        qMap.set(`${q.year}-Q${q.quarter}`, q.revenue!);
      }
      const recentQ = validQ.slice(-8);
      let runningMax = 0;
      const history = recentQ.map((q, idx) => {
        const rev = q.revenue!;
        const lastYearRev = qMap.get(`${q.year - 1}-Q${q.quarter}`);
        const prevQ = idx > 0 ? recentQ[idx - 1].revenue! : undefined;
        const yoyRate =
          lastYearRev && lastYearRev > 0
            ? Number((((rev - lastYearRev) / lastYearRev) * 100).toFixed(1))
            : undefined;
        const momRate =
          prevQ && prevQ > 0 ? Number((((rev - prevQ) / prevQ) * 100).toFixed(1)) : undefined;
        const isAllTimeHigh = rev >= runningMax && runningMax > 0;
        if (rev > runningMax) runningMax = rev;
        return {
          yearMonth: `${q.year}Q${q.quarter}`,
          revenue: rev,
          lastYearRevenue: lastYearRev,
          yoyRate,
          momRate,
          isAllTimeHigh,
        };
      });

      const latest = history[history.length - 1];
      let streak = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if ((history[i].yoyRate ?? 0) > 0 && (history[i].momRate ?? 0) > 0) streak++;
        else break;
      }

      const formatUsdRevenue = (val: number) => {
        if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        return `$${val.toLocaleString()}`;
      };

      let growthBadge = '季營收穩健成長';
      if (streak >= 3) growthBadge = '連續 3 季年季雙增';
      else if (latest.isAllTimeHigh) growthBadge = '單季創高 (ATH)';
      else if ((latest.yoyRate ?? 0) > 20) growthBadge = '季營收強勁雙位數成長';
      else if ((latest.yoyRate ?? 0) < 0) growthBadge = '季營收年減衰退';

      return {
        isEtf: false,
        isQuarterly: true,
        isUsMarket: true,
        currency: 'USD',
        history,
        latestRevenueText: formatUsdRevenue(latest.revenue),
        latestYoyRate: latest.yoyRate,
        growthStreakMonths: streak,
        athCount: history.filter((h) => h.isAllTimeHigh).length,
        growthBadge,
        asOfDateText: `10-Q/10-K 季營收基準: ${latest.yearMonth}`,
        isEmpty: false,
      };
    }
  }

  if (!records || records.length === 0) {
    return {
      isEtf: false,
      isUsMarket: isUs,
      currency: isUs ? 'USD' : 'TWD',
      history: [],
      growthBadge: '尚無營收',
      asOfDateText: '無營收資料',
      isEmpty: true,
      emptyMessage: isUs ? '美股採季度財報 (10-Q/10-K)，季報資料累積中' : '月營收數據累積中 (每月 10 日公布)',
    };
  }

  const sorted = [...records].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const history = sorted.map((r) => ({
    yearMonth: r.yearMonth,
    revenue: r.revenue,
    lastYearRevenue: r.lastYearRevenue ?? (r as any).last_year_revenue,
    yoyRate: r.yoyRate ?? (r as any).yoy_rate ?? (r as any).yoyGrowth,
    momRate: r.momRate ?? (r as any).mom_rate ?? (r as any).momGrowth,
    isAllTimeHigh: Boolean(r.isAllTimeHigh ?? (r as any).is_all_time_high),
  }));

  const latest = history[history.length - 1];
  const athCount = history.filter((h) => h.isAllTimeHigh).length;

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if ((item.yoyRate ?? 0) > 0 && (item.momRate ?? 0) > 0) {
      streak++;
    } else {
      break;
    }
  }

  let growthBadge = '營收穩健成長';
  if (streak >= 3) {
    growthBadge = '連續 3 個月年月雙增';
  } else if (latest.isAllTimeHigh) {
    growthBadge = '創歷史新高 (ATH)';
  } else if (latest.yoyRate !== undefined && latest.yoyRate > 20) {
    growthBadge = '營收強勁雙位數成長';
  } else if (latest.yoyRate !== undefined && latest.yoyRate < 0) {
    growthBadge = '營收年減衰退';
  }

  const formatRevenue = (revThousands: number) => {
    const revTotal = revThousands * 1000;
    if (Math.abs(revTotal) >= 100_000_000) {
      return `${(revTotal / 100_000_000).toFixed(1)} 億元`;
    }
    return `${(revTotal / 10_000).toFixed(0)} 萬元`;
  };

  return {
    isEtf: false,
    history,
    latestRevenueText: formatRevenue(latest.revenue),
    latestYoyRate: latest.yoyRate,
    growthStreakMonths: streak,
    athCount,
    growthBadge,
    asOfDateText: `營收基準: ${latest.yearMonth}`,
    isEmpty: false,
  };
}

/**
 * 依據真實法人進出記錄或成交量多空模型建構卡片 08 之雙軸圖數列與明細 (Spec 0169: 完全零假數據)
 */
export function buildInstitutionalFlow(
  candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>,
  records?: RawInstitutionalRecord[],
  market: MarketType = 'TW'
): InstitutionalFlowData {
  const formatSigned = (num: number) => (num >= 0 ? `+${num.toLocaleString()}` : num.toLocaleString());

  // 美股標的：100% 根除三大法人偽數據，切換為微觀量價動能評分
  if (market === 'US') {
    const usMicroScore = calculateUsMicrostructureInstitutionalScore(candles as any);
    const last20Candles = candles.slice(-20);
    const avgVol20 = last20Candles.reduce((a, c) => a + c.volume, 0) / Math.max(1, last20Candles.length);
    const last5Candles = candles.slice(-5);
    const avgVol5 = last5Candles.reduce((a, c) => a + c.volume, 0) / Math.max(1, last5Candles.length);
    const volumeRatio = avgVol20 > 0 ? Number((avgVol5 / avgVol20).toFixed(2)) : 1.0;
    let sentimentLabel = '動能中性';
    if (usMicroScore >= 65) sentimentLabel = '機構量價偏多';
    else if (usMicroScore <= 40) sentimentLabel = '機構調節中';

    return {
      history: [],
      recentDaysTable: [],
      cumulative20DaysSummary: `美股微觀量價動能評估 (${usMicroScore}分)`,
      recent5DaysSummary: '美股無三大法人日報',
      isUsMarket: true,
      usMicrostructure: {
        score: usMicroScore,
        sentimentLabel,
        mfi: Math.min(100, Math.max(0, usMicroScore)),
        obvTrend: usMicroScore >= 55 ? 'UP' : usMicroScore <= 45 ? 'DOWN' : 'FLAT',
        volumeRatio,
        note: '美股無三大法人日報，已切換為機構量價評分',
      },
      asOfDateText: candles.length > 0 ? candles[candles.length - 1].date : undefined,
    };
  }

  // 台股標的：若有真實三大法人資料
  if (records && records.length > 0) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const history = sorted.map((r) => {
      const net = r.foreignShares + r.trustShares + r.dealerShares;
      cumulative += net;
      return {
        date: r.date,
        foreignShares: r.foreignShares,
        trustShares: r.trustShares,
        dealerShares: r.dealerShares,
        cumulativeTotalShares: cumulative,
      };
    });

    const recent5 = sorted.slice(-5).reverse().map((r) => ({
      date: r.date.includes('-') ? r.date.substring(5).replace('-', '/') : r.date,
      foreignShares: r.foreignShares,
      trustShares: r.trustShares,
      dealerShares: r.dealerShares,
      totalShares: r.foreignShares + r.trustShares + r.dealerShares,
    }));

    const last20 = sorted.slice(-20);
    const sum20 = last20.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const last5 = sorted.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const lastDate = sorted[sorted.length - 1].date;

    return {
      history,
      recentDaysTable: recent5,
      cumulative20DaysSummary: `${sum20 >= 0 ? '多頭' : '偏空'} (20日 ${formatSigned(sum20)}張)`,
      recent5DaysSummary: `${sum5 >= 0 ? '偏多' : '偏空'} (${formatSigned(sum5)}張)`,
      isUsMarket: false,
      asOfDateText: `法人基準日: ${lastDate}`,
    };
  }

  // Zero-Mock Policy: 無法人資料時嚴禁假造張數
  return {
    history: [],
    recentDaysTable: [],
    cumulative20DaysSummary: '尚無法人日報數據',
    recent5DaysSummary: '待三大法人公布',
    isUsMarket: false,
    asOfDateText: '法人資料待公布',
  };
}

/**
 * 依據紅 K 與黑 K 成交量計算多空能量比 (Card 10)
 */
export function calculateBullBearEnergyFromCandles(
  candles: Array<{ open: number; close: number; volume: number }>
): BullBearEnergyData {
  const recent20 = candles.slice(-20);
  let bullVol = 0;
  let bearVol = 0;
  for (const c of recent20) {
    if (c.close >= c.open) {
      bullVol += c.volume;
    } else {
      bearVol += c.volume;
    }
  }

  if (bullVol <= 0 && bearVol <= 0) {
    return {
      bullEnergyPercent: 50,
      bearEnergyPercent: 50,
      bullBearRatio: 1,
      bullBearConclusion: '均衡',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  if (bearVol <= 0 && bullVol > 0) {
    return {
      bullEnergyPercent: 100,
      bearEnergyPercent: 0,
      bullBearRatio: 99.99,
      bullBearConclusion: '極度偏多',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  if (bullVol <= 0 && bearVol > 0) {
    return {
      bullEnergyPercent: 0,
      bearEnergyPercent: 100,
      bullBearRatio: 0,
      bullBearConclusion: '極度偏空',
      noteText: '(20日紅K量/黑K量)',
    };
  }

  const total = bullVol + bearVol;
  const bullEnergyPercent = Math.round((bullVol / total) * 100);
  const bearEnergyPercent = 100 - bullEnergyPercent;
  const bullBearRatio = Math.round((bullVol / bearVol) * 100) / 100;

  let bullBearConclusion = '均衡';
  if (bullBearRatio >= 1.5) {
    bullBearConclusion = '多方強勢';
  } else if (bullBearRatio > 1.05) {
    bullBearConclusion = '偏多';
  } else if (bullBearRatio <= 0.67) {
    bullBearConclusion = '空方強勢';
  } else if (bullBearRatio < 0.95) {
    bullBearConclusion = '偏空';
  }

  return {
    bullEnergyPercent,
    bearEnergyPercent,
    bullBearRatio,
    bullBearConclusion,
    noteText: '(20日紅K量/黑K量)',
  };
}

/**
 * 依據均線、量能與法人動向計算健康度 5 環綜合評估 (Card 11)
 */
export function calculateHealthSummaryFromCandles(
  candles: KlineCandleItem[],
  institutionalFlow: InstitutionalFlowData,
  market: MarketType = 'TW',
  usMicroScore?: number
): HealthSummaryData {
  const last = candles[candles.length - 1];
  const resolvedUsScore =
    market === 'US'
      ? (usMicroScore ?? institutionalFlow.usMicrostructure?.score ?? 50)
      : undefined;

  // 1. 籌碼健康度 (Spec 0239 T08: 美股改由機構量價微結構驅動，不再鎖死 50%)
  let chipHealth = 50;
  if (market === 'US' && resolvedUsScore !== undefined) {
    chipHealth = Math.max(10, Math.min(95, Math.round(resolvedUsScore)));
  } else if (institutionalFlow.history.length > 0) {
    const last5 = institutionalFlow.history.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    if (sum5 > 1000) chipHealth = 85;
    else if (sum5 > 200) chipHealth = 70;
    else if (sum5 > 0) chipHealth = 60;
    else if (sum5 < -1000) chipHealth = 25;
    else if (sum5 < -200) chipHealth = 35;
    else chipHealth = 45;
  }

  // 2. 技術型態 (均線多頭排列度)
  let technicalStructure = 50;
  const ma5 = last.ma5 ?? last.close;
  const ma10 = last.ma10 ?? last.close;
  const ma20 = last.ma20 ?? last.close;
  const ma60 = last.ma60 ?? last.close;
  if (last.close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
    technicalStructure = 90;
  } else if (last.close > ma20 && ma5 > ma20) {
    technicalStructure = 75;
  } else if (last.close < ma20 && last.close > ma60) {
    technicalStructure = 45;
  } else if (last.close < ma60) {
    technicalStructure = 25;
  }

  // 3. 資金動能 (最新日成交量相對 20 日均量)
  const recent20 = candles.slice(-20);
  const avgVol20 = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
  const volRatio = avgVol20 > 0 ? last.volume / avgVol20 : 1;
  let capitalMomentum = 50;
  const isUp = last.close >= last.open;
  if (isUp && volRatio > 1.5) capitalMomentum = 85;
  else if (isUp && volRatio > 1.0) capitalMomentum = 70;
  else if (!isUp && volRatio > 1.5) capitalMomentum = 30;
  else if (!isUp && volRatio > 1.0) capitalMomentum = 40;
  else capitalMomentum = 55;

  // 4. 流動性風險 (5日日均成交量，嚴格區分台股張數 vs 美股股數門檻，Spec 0239 T08)
  const recent5 = candles.slice(-5);
  const rawAvgVol5 = recent5.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent5.length);
  let liquidityRisk = 15;
  if (market === 'US') {
    if (rawAvgVol5 >= 2_000_000) liquidityRisk = 5;
    else if (rawAvgVol5 >= 500_000) liquidityRisk = 15;
    else if (rawAvgVol5 >= 100_000) liquidityRisk = 30;
    else if (rawAvgVol5 >= 20_000) liquidityRisk = 55;
    else liquidityRisk = 78;
  } else {
    const avgVol5Lots = rawAvgVol5 / 1000;
    if (avgVol5Lots > 3000) liquidityRisk = 5;
    else if (avgVol5Lots > 1000) liquidityRisk = 12;
    else if (avgVol5Lots > 300) liquidityRisk = 28;
    else if (avgVol5Lots > 50) liquidityRisk = 50;
    else liquidityRisk = 70;
  }

  // 5. 法人/機構支撐力 (Spec 0239 T08: 美股改由微結構 + OBV 趨勢驅動)
  let institutionalSupport = 50;
  if (market === 'US' && resolvedUsScore !== undefined) {
    const obvBonus =
      institutionalFlow.usMicrostructure?.obvTrend === 'UP'
        ? 8
        : institutionalFlow.usMicrostructure?.obvTrend === 'DOWN'
        ? -8
        : 0;
    institutionalSupport = Math.max(10, Math.min(95, Math.round(resolvedUsScore + obvBonus)));
  } else if (institutionalFlow.history.length > 0) {
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    const cum = lastInst.cumulativeTotalShares;
    if (cum > 2000) institutionalSupport = 85;
    else if (cum > 500) institutionalSupport = 70;
    else if (cum > 0) institutionalSupport = 58;
    else if (cum < -2000) institutionalSupport = 20;
    else if (cum < -500) institutionalSupport = 35;
    else institutionalSupport = 45;
  }

  // 流動性風險為負向指標，綜合評分採正向反轉 (100 - liquidityRisk)
  const values = [
    chipHealth,
    technicalStructure,
    capitalMomentum,
    Math.max(0, Math.min(100, 100 - liquidityRisk)),
    institutionalSupport,
  ];
  const averageScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  let overallRatingLabel = '普通 (平均 50 分)';
  if (averageScore >= 75) overallRatingLabel = `優良 (平均 ${averageScore} 分)`;
  else if (averageScore >= 60) overallRatingLabel = `良好 (平均 ${averageScore} 分)`;
  else if (averageScore >= 45) overallRatingLabel = `普通 (平均 ${averageScore} 分)`;
  else overallRatingLabel = `偏弱 (平均 ${averageScore} 分)`;

  return {
    chipHealth,
    technicalStructure,
    capitalMomentum,
    liquidityRisk,
    institutionalSupport,
    overallRatingLabel,
  };
}

/**
 * 依據收盤價、VWAP 乖離率與法人方向計算主力動態信號 (Card 12)
 */
export type DynamicArbitrationPattern =
  | 'BEAR_TRAP'
  | 'BULL_TRAP'
  | 'HARMONIC_SURGE'
  | 'HARMONIC_COLLAPSE'
  | 'NEUTRAL_RANGE';

export interface SignalArbitrationResult {
  patternType: DynamicArbitrationPattern;
  actionableAdvice: string;
}

/**
 * 多空矛盾智能仲裁演算法 (Spec 0179 / Ticket 03)
 */
export function arbitrateSignals(
  trendSignal: string,
  chipSignal: string,
  momentumSignal: string,
  riskSignal: string
): SignalArbitrationResult {
  // 1. 洗盤破底翻 (Bear Trap)
  if (
    (trendSignal.includes('破線') || trendSignal.includes('偏弱')) &&
    (chipSignal.includes('集中') || chipSignal.includes('合買')) &&
    (momentumSignal.includes('超跌') || momentumSignal.includes('偏弱') || riskSignal.includes('破位'))
  ) {
    return {
      patternType: 'BEAR_TRAP',
      actionableAdvice:
        '主力逆勢吸籌但短線破線，疑似洗盤破底翻觀察區。建議觀望勿殺低，待放量站回 5 日線轉強再行加碼。',
    };
  }

  // 2. 誘多高檔出貨 (Bull Trap)
  if (
    (trendSignal.includes('偏多') || trendSignal.includes('強')) &&
    (chipSignal.includes('渙散') || chipSignal.includes('調節') || chipSignal.includes('對作')) &&
    (riskSignal.includes('偏高') || riskSignal.includes('警戒') || momentumSignal.includes('過熱'))
  ) {
    return {
      patternType: 'BULL_TRAP',
      actionableAdvice:
        '股價雖處多頭，但主力持續調節，呈現出貨背離。切勿追高，嚴防主力倒貨引發快速回檔。',
    };
  }

  // 3. 共振主升段 (Harmonic Surge)
  if (
    (trendSignal.includes('多') || trendSignal.includes('強')) &&
    (chipSignal.includes('集中') || chipSignal.includes('合買')) &&
    (momentumSignal.includes('強') || momentumSignal.includes('過熱'))
  ) {
    return {
      patternType: 'HARMONIC_SURGE',
      actionableAdvice:
        '量價齊揚、籌碼高度集中，波段多頭共振主升趨勢明確，順勢持有或沿 5 日線偏多操作。',
    };
  }

  // 4. 共振破位主跌段 (Harmonic Collapse)
  if (
    (trendSignal.includes('破線') || trendSignal.includes('偏弱')) &&
    (chipSignal.includes('渙散') || chipSignal.includes('調節')) &&
    (riskSignal.includes('破位') || riskSignal.includes('偏高'))
  ) {
    return {
      patternType: 'HARMONIC_COLLAPSE',
      actionableAdvice:
        '均線全數跌破，籌碼外資投信同步砍倉，主跌段殺盤風險極高。嚴格執行停損退場，切勿猜底。',
    };
  }

  // 5. 預設區間整理 (Neutral Range)
  return {
    patternType: 'NEUTRAL_RANGE',
    actionableAdvice:
      '指標多空分歧，短線處於區間整理。建議觀望等待方向確認，切忌追漲殺跌。',
  };
}

/**
 * 依據收盤價、VWAP 乖離率與法人方向計算主力動態信號 (Card 12，升級四重視角整合)
 */
export function calculateDynamicSignalsFromCandles(
  candles: KlineCandleItem[],
  mainForceCost: number,
  institutionalFlow: InstitutionalFlowData,
  options?: {
    market?: MarketType;
    usMicroScore?: number;
    shortFloatRatio?: number;
    dispositionStatus?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
    marginBalance?: number;
    marginBalanceChange?: number;
    dayTradeRate?: number;
  }
): DynamicSignalsData {
  const last = candles[candles.length - 1];
  const isUs = options?.market === 'US' || Boolean(institutionalFlow.isUsMarket);
  const vwapBias = mainForceCost > 0 ? ((last.close - mainForceCost) / mainForceCost) * 100 : 0;

  // 1. 趨勢信號
  let trendSignal = '區間整理';
  let trendScore = 50;
  if (vwapBias > 4) {
    trendSignal = '偏多偏強';
    trendScore = 85;
  } else if (vwapBias > 0) {
    trendSignal = '溫和偏多';
    trendScore = 70;
  } else if (vwapBias < -4) {
    trendSignal = '破線偏空';
    trendScore = 20;
  } else {
    trendSignal = '偏弱整理';
    trendScore = 35;
  }

  // 2. 籌碼信號 (Spec 0239 T08: 美股改由機構微結構解鎖，徹底解除 55 分封頂與仲裁癱瘓)
  let chipSignal = '籌碼中性';
  let chipScore = 50;
  if (isUs) {
    const usScore = options?.usMicroScore ?? institutionalFlow.usMicrostructure?.score ?? 50;
    if (usScore >= 70) {
      chipSignal = '機構籌碼集中';
      chipScore = 85;
    } else if (usScore >= 58) {
      chipSignal = '機構集中吸籌';
      chipScore = 72;
    } else if (usScore <= 35) {
      chipSignal = '機構籌碼渙散';
      chipScore = 22;
    } else if (usScore <= 45) {
      chipSignal = '機構調節降溫';
      chipScore = 38;
    } else {
      chipSignal = '量價籌碼中性';
      chipScore = Math.max(45, Math.min(58, Math.round(usScore)));
    }
  } else if (institutionalFlow.history.length > 0) {
    const last5 = institutionalFlow.history.slice(-5);
    const sum5 = last5.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    if (lastInst.foreignShares > 0 && lastInst.trustShares > 0) {
      chipSignal = '土洋合買';
      chipScore = 85;
    } else if (lastInst.foreignShares * lastInst.trustShares < 0) {
      chipSignal = '土洋對作';
      chipScore = 40;
    } else if (sum5 > 500) {
      chipSignal = '籌碼集中';
      chipScore = 80;
    } else if (sum5 < -500) {
      chipSignal = '籌碼渙散';
      chipScore = 20;
    }
  }

  // 3. 動能信號
  let momentumSignal = '動能整理';
  let momentumScore = 50;
  const k = last.k ?? 50;
  const d = last.d ?? 50;
  const rsi = last.rsi ?? 50;
  if (rsi > 75) {
    momentumSignal = '動能過熱';
    momentumScore = 80;
  } else if (rsi < 30) {
    momentumSignal = '動能超跌';
    momentumScore = 25;
  } else if (k > d && rsi > 50) {
    momentumSignal = '動能偏強';
    momentumScore = 75;
  } else if (k < d && rsi < 50) {
    momentumSignal = '動能偏弱';
    momentumScore = 30;
  }

  // 4. 風險信號
  let riskSignal = '風險可控';
  let riskScore = 20;
  const ma20 = last.ma20 ?? last.close;
  if (last.close < ma20 && vwapBias < -5) {
    riskSignal = '破位警戒';
    riskScore = 85;
  } else if (rsi > 75 || Math.abs(vwapBias) > (isUs ? 12 : 8)) {
    riskSignal = '波動偏高';
    riskScore = 60;
  }

  // 5. 多因子綜合評分與動態燈號 (Spec 0179)
  const compositeScore = calculateCompositeQuantScore(trendScore, chipScore, momentumScore, riskScore);
  const verdictLight = mapScoreToVerdictLight(compositeScore);

  const verdictLabel =
    verdictLight === 'RED'
      ? '紅燈 (偏空 / 高風險)'
      : verdictLight === 'YELLOW'
      ? '黃燈 (觀望 / 中性)'
      : '綠燈 (偏多 / 安全)';

  // 6. 多空矛盾智能仲裁
  const arbitration = arbitrateSignals(trendSignal, chipSignal, momentumSignal, riskSignal);

  // 7. 交易所視角監理標籤 (美股隔離台股處置/當沖詞彙，改顯軋空警戒)
  let regulatoryBadge: string | undefined = undefined;
  if (isUs) {
    if ((options?.shortFloatRatio ?? 0) > 10) {
      regulatoryBadge = `高軋空警戒 (Short Float ${options!.shortFloatRatio!.toFixed(1)}%)`;
    }
  } else if (options?.dispositionStatus === 'DISPOSITION') {
    regulatoryBadge = '處置股票 (分盤撮合)';
  } else if (options?.dispositionStatus === 'ATTENTION') {
    regulatoryBadge = '列注意股票';
  } else if ((options?.dayTradeRate ?? 0) > 60) {
    regulatoryBadge = '當沖過熱投機警戒';
  }

  // 8. 券商視角融資警戒 (僅台股適用)
  let brokerMarginAlert: string | undefined = undefined;
  if (!isUs) {
    if (
      (options?.marginBalanceChange ?? 0) > 0 &&
      (trendSignal.includes('破線') || trendSignal.includes('偏弱'))
    ) {
      brokerMarginAlert = '融資浮額沉重 / 斷頭防守警戒';
    } else if ((options?.dayTradeRate ?? 0) > 60) {
      brokerMarginAlert = '當沖高比率 浮額劇烈震盪';
    }
  }

  // 9. 法人視角 VWAP 標準差偏離
  const last20Candles = candles.slice(-20);
  const meanClose = last20Candles.reduce((acc, c) => acc + c.close, 0) / Math.max(1, last20Candles.length);
  const variance =
    last20Candles.reduce((acc, c) => acc + Math.pow(c.close - meanClose, 2), 0) / Math.max(1, last20Candles.length);
  const stdDev = Math.sqrt(variance);
  let vwapBiasStdText: string | undefined = undefined;
  if (stdDev > 0) {
    const zScore = (last.close - mainForceCost) / stdDev;
    vwapBiasStdText = `${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)}σ ${
      zScore > 2 ? '超買過熱' : zScore < -2 ? '超跌' : '常態'
    }`;
  } else {
    vwapBiasStdText = `${vwapBias >= 0 ? '+' : ''}${vwapBias.toFixed(1)}% (成本乖離)`;
  }

  // 10. 個人投資者關鍵價位
  const keySupportPrice = last.ma20 ? Number(last.ma20.toFixed(2)) : Number((last.close * 0.95).toFixed(2));
  const keyPressurePrice = last.ma5 ? Number(last.ma5.toFixed(2)) : Number((last.close * 1.05).toFixed(2));

  return {
    trendSignal,
    chipSignal,
    momentumSignal,
    riskSignal,
    verdictLight,
    verdictLabel,
    compositeScore,
    regulatoryBadge,
    brokerMarginAlert,
    vwapBiasStdText,
    actionableAdvice: arbitration.actionableAdvice,
    keySupportPrice,
    keyPressurePrice,
  };
}

export interface CompositeQuantWeights {
  chipWeight?: number;
  trendWeight?: number;
  momentumWeight?: number;
  riskWeight?: number;
}

/**
 * 多因子量化評分純函式 (Spec 0179 / Ticket 02)
 * 公式：0.35 * 籌碼 + 0.30 * 趨勢 + 0.20 * 動能 - 0.15 * 風險 (支援自訂策略權重)
 * 範圍截斷為 0~100 分整數
 */
export function calculateCompositeQuantScore(
  trendScore: number,
  chipScore: number,
  momentumScore: number,
  riskScore: number,
  weights?: CompositeQuantWeights
): number {
  const wChip = weights?.chipWeight ?? 0.35;
  const wTrend = weights?.trendWeight ?? 0.30;
  const wMomentum = weights?.momentumWeight ?? 0.20;
  const wRisk = weights?.riskWeight ?? 0.15;

  const raw = wChip * chipScore + wTrend * trendScore + wMomentum * momentumScore - wRisk * riskScore;
  const clamped = Math.max(0, Math.min(100, Math.round(raw)));
  return clamped;
}

/**
 * 將綜合量化分映射至結論燈號 (Spec 0179 / Ticket 02)
 * >= 60 -> 'GREEN'
 * 40~59 -> 'YELLOW'
 * < 40  -> 'RED'
 */
export function mapScoreToVerdictLight(score: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (score >= 60) return 'GREEN';
  if (score >= 40) return 'YELLOW';
  return 'RED';
}

/**
 * 依據日 K 紅黑量能與法人淨買賣比動態推算買賣力分佈 (Card 16)
 */
export function calculateForceDistributionFromCandles(
  candles: KlineCandleItem[],
  asOfDate: string,
  institutionalFlow?: InstitutionalFlowData,
  market: MarketType = 'TW'
): ForceDistributionData {
  const recent20 = candles.slice(-20);
  let bullVol = 0;
  let bearVol = 0;
  for (const c of recent20) {
    if (c.close >= c.open) bullVol += c.volume;
    else bearVol += c.volume;
  }
  const total = bullVol + bearVol;
  const bullRatio = total > 0 ? bullVol / total : 0.5;

  let instBias = 0;
  if (institutionalFlow && institutionalFlow.history.length > 0) {
    const recent20Inst = institutionalFlow.history.slice(-20);
    const sum20Inst = recent20Inst.reduce(
      (acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares,
      0
    );
    const totalVolLots = market === 'TW' ? total / 1000 : total;
    const instRatio = totalVolLots > 0 ? sum20Inst / totalVolLots : 0;
    instBias = Math.max(-0.35, Math.min(0.35, instRatio * 1.5));
  }

  const effectiveBullRatio = Math.max(0.05, Math.min(0.95, bullRatio + instBias));
  const largePlayerBuyPercent = Math.min(85, Math.max(25, Math.round(effectiveBullRatio * 60 + 20)));
  const retailBuyPercent = 100 - largePlayerBuyPercent;
  const retailSellPressurePercent = Math.min(80, Math.max(20, Math.round((1 - effectiveBullRatio) * 55 + 20)));

  return {
    largePlayerBuyPercent,
    retailBuyPercent,
    retailSellPressurePercent,
    asOfDateText:
      market === 'US'
        ? `${asOfDate} (美股機構量價微結構推估，依 20 日平均)`
        : `${asOfDate} (法人買進/賣出佔成交量比例，依 20 日平均)`,
    isUsMarket: market === 'US',
  };
}

/**
 * 依據 RSI、KD 與均線綜合計算多空強度分佈 (Card 17)
 */
export function calculateBullBearStrengthFromCandles(
  candles: KlineCandleItem[]
): BullBearStrengthData {
  const last = candles[candles.length - 1];
  const rsi = last.rsi ?? 50;
  const k = last.k ?? 50;
  const ma20 = last.ma20 ?? last.close;

  let bullStrengthPercent = Math.round(rsi * 0.45 + k * 0.35 + (last.close >= ma20 ? 20 : 0));
  bullStrengthPercent = Math.max(5, Math.min(95, bullStrengthPercent));
  const bearStrengthPercent = 100 - bullStrengthPercent;

  const recent20 = candles.slice(-20);
  const avg20 = recent20.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent20.length);
  const recent5 = candles.slice(-5);
  const avg5 = recent5.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, recent5.length);
  const volRatio = avg20 > 0 ? avg5 / avg20 : 1;
  const volumeStrengthPercent = Math.max(10, Math.min(95, Math.round(volRatio * 50)));

  // 放量長黑不應推升多方綜合分 (Spec 0239 T09)
  const directionalVolScore =
    last.close < last.open && volRatio > 1.2
      ? Math.max(10, 100 - volumeStrengthPercent)
      : volumeStrengthPercent;
  const compositeScore = Math.round(bullStrengthPercent * 0.6 + directionalVolScore * 0.4);
  let tier = 3;
  if (compositeScore >= 80) tier = 1;
  else if (compositeScore >= 65) tier = 2;
  else if (compositeScore >= 50) tier = 3;
  else if (compositeScore >= 35) tier = 4;
  else tier = 5;

  return {
    bullStrengthPercent,
    bearStrengthPercent,
    volumeStrengthPercent,
    signalTierLevel: tier,
    compositeScore,
  };
}

export interface GenerateReportOptions {
  statusTag?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
  currency?: 'TWD' | 'USD';
  volumeUnit?: '張' | '股';
  marginData?: {
    marginBalance?: number;
    shortBalance?: number;
    dayTradeRate?: number;
    sblBalance?: number;
    marginBalanceChange?: number;
    shortBalanceChange?: number;
  };
  tdccRecords?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>;
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
  institutionalRecords?: RawInstitutionalRecord[];
  us13fData?: Us13fChipData;
  metaType?: string;
  etfMeta?: {
    aumBillion?: number | null;
    expenseRatio?: number | null;
  };
  quarterlyFinancials?: Array<{
    year: number;
    quarter: number;
    revenue?: number | null;
    grossProfit?: number | null;
    operatingIncome?: number | null;
    netIncome?: number | null;
    eps?: number | null;
    periodDate?: string;
  }>;
  valuationData?: {
    pe?: number | null;
    forwardPe?: number | null;
    pb?: number | null;
    psRatio?: number | null;
    dividendYield?: number | null;
    asOfDate?: string;
    eps?: number | null;
    quarterName?: string;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    history?: Array<{
      pe?: number | null;
      pb?: number | null;
      dividendYield?: number | null;
      date?: string;
    }>;
  };
  macroData?: any;
  corporateActions?: Array<{
    exDate: string;
    paymentDate?: string;
    cashDividendPerShare?: number;
    stockDividendRatio?: number;
    mandatoryBuybackDate?: string;
  }>;
  etfNav?: {
    date: string;
    closePrice?: number;
    nav?: number;
    premiumDiscountRatio?: number;
  };
  pledge?: {
    report_date?: string;
    pledged_shares?: number;
    total_director_shares?: number;
    pledge_ratio?: number;
    insider_transfer_shares?: number;
  };
}

/**
 * 依據真實歷史日 K (OHLCV) 數列動態生成完整的 AiForceDashboardReport (Spec 0140 階段一 & Spec 0143 階段二)
 */
export function generateAiForceReportFromCandles(
  symbol: string = '0050',
  name: string = '元大台灣50',
  market: MarketType = 'TW',
  candles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    transactions?: number;
    isIntraday?: boolean;
  }> = [],
  realtimeQuote?: {
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    transactions?: number;
  },
  institutionalRecords?: RawInstitutionalRecord[],
  referenceDate: Date = new Date(),
  options?: GenerateReportOptions
): AiForceDashboardReport {
  // 1. 市場結算狀態檢測 (Spec 0150)
  const settlement = getMarketSettlementStatus(market, referenceDate);

  // 若未結算，基礎日 K 先過濾至 anchorTradingDate 確保指標計算嚴謹性
  let effectiveCandles = candles;
  let effectiveInstRecords = institutionalRecords ?? options?.institutionalRecords;
  if (!settlement.isSettled && candles && candles.length > 0) {
    const filtered = candles.filter((c) => c.date <= settlement.anchorTradingDate);
    if (filtered.length >= 5) {
      effectiveCandles = filtered;
    }
    if (effectiveInstRecords && effectiveInstRecords.length > 0) {
      effectiveInstRecords = effectiveInstRecords.filter(
        (r) => r.date <= settlement.anchorTradingDate
      );
    }

    // Spec 0170 / Ticket 08: 盤中 (09:00~13:30) 與盤後未結算 (13:30~15:00) 時態行情動態縫合
    // 當外部傳入有效即時行情 realtimeQuote?.price > 0 時，動態構造當日虛擬日 K 並追加至有效數列
    const todayYmd = settlement.currentTradingDate || formatDateToYMD(referenceDate);
    const lastDate = effectiveCandles.length > 0 ? effectiveCandles[effectiveCandles.length - 1].date : '';
    if (realtimeQuote?.price !== undefined && realtimeQuote.price > 0 && lastDate < todayYmd) {
      const openPrice = realtimeQuote.open ?? realtimeQuote.price;
      const highPrice = realtimeQuote.high ?? Math.max(realtimeQuote.price, openPrice);
      const lowPrice = realtimeQuote.low ?? Math.min(realtimeQuote.price, openPrice);
      const stitchedIntradayCandle = {
        date: todayYmd,
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        close: realtimeQuote.price,
        volume: realtimeQuote.volume ?? 0,
        transactions: realtimeQuote.transactions,
        isIntraday: true,
      };
      effectiveCandles = [...effectiveCandles, stitchedIntradayCandle];
    }
  } else if (settlement.isSettled && effectiveCandles && effectiveCandles.length > 0) {
    // Spec 0160: 若市場今日已結算且湖倉日 K 稍有落後，若有外部即時收盤價，進行日 K 自適應防斷層縫合
    const lastDate = effectiveCandles[effectiveCandles.length - 1].date;
    if (lastDate < settlement.anchorTradingDate && realtimeQuote?.price !== undefined && realtimeQuote.price > 0) {
      const stitchedCandle = {
        date: settlement.anchorTradingDate,
        open: realtimeQuote.open ?? realtimeQuote.price,
        high: realtimeQuote.high ?? Math.max(realtimeQuote.price, realtimeQuote.open ?? realtimeQuote.price),
        low: realtimeQuote.low ?? Math.min(realtimeQuote.price, realtimeQuote.open ?? realtimeQuote.price),
        close: realtimeQuote.price,
        volume: realtimeQuote.volume ?? 0,
        transactions: realtimeQuote.transactions,
      };
      effectiveCandles = [...effectiveCandles, stitchedCandle];
    }
  }

  // 安全邊界：不足 5 根時安全回退至預設 report，若有 1~4 根歷史日 K，以最後一根真實日 K 填補收盤價與日期
  if (!effectiveCandles || effectiveCandles.length < 5) {
    const hasFewCandles = effectiveCandles && effectiveCandles.length > 0;
    const lastValidCandle = hasFewCandles ? effectiveCandles[effectiveCandles.length - 1] : undefined;
    const fallbackBasePrice = realtimeQuote?.price ?? lastValidCandle?.close;

    const fallback = createDefaultAiForceReport(symbol, name, market, fallbackBasePrice, referenceDate);
    if (realtimeQuote?.price) {
      fallback.marketBar.currentPrice = realtimeQuote.price;
      if (realtimeQuote.change !== undefined) fallback.marketBar.change = realtimeQuote.change;
      if (realtimeQuote.changePercent !== undefined) fallback.marketBar.changePercent = realtimeQuote.changePercent;
      if (realtimeQuote.open !== undefined) fallback.marketBar.openPrice = realtimeQuote.open;
      if (realtimeQuote.high !== undefined) fallback.marketBar.highPrice = realtimeQuote.high;
      if (realtimeQuote.low !== undefined) fallback.marketBar.lowPrice = realtimeQuote.low;
      if (realtimeQuote.volume !== undefined) {
        fallback.marketBar.volumeShares = market === 'TW' ? Math.round(realtimeQuote.volume / 1000) : realtimeQuote.volume;
      }
      if (realtimeQuote.transactions !== undefined) {
        fallback.marketBar.transactionCount = realtimeQuote.transactions;
      } else if (lastValidCandle && (lastValidCandle as any).transactions !== undefined) {
        fallback.marketBar.transactionCount = (lastValidCandle as any).transactions;
      }
    } else if (lastValidCandle) {
      fallback.marketBar.currentPrice = lastValidCandle.close;
      fallback.marketBar.openPrice = lastValidCandle.open;
      fallback.marketBar.highPrice = lastValidCandle.high;
      fallback.marketBar.lowPrice = lastValidCandle.low;
      fallback.marketBar.volumeShares = market === 'TW' ? Math.round(lastValidCandle.volume / 1000) : lastValidCandle.volume;
      if ((lastValidCandle as any).transactions !== undefined) {
        fallback.marketBar.transactionCount = (lastValidCandle as any).transactions;
      }
      fallback.marketBar.latestTradingDate = lastValidCandle.date;
      fallback.marketBar.anchorTradingDate = lastValidCandle.date;
      fallback.marketBar.dataPointsCount = effectiveCandles.length;
      fallback.marketBar.dataRangeText = `${effectiveCandles[0].date} ~ ${lastValidCandle.date}，共 ${effectiveCandles.length} 個交易日`;
      // Spec 0239 T09: 不足 5 日 K 嚴格維持 isDataPending = true，杜絕假卡片外洩
      fallback.isDataPending = true;
    }

    fallback.marketBar.isSettled = settlement.isSettled;
    if (!lastValidCandle) {
      fallback.marketBar.anchorTradingDate = settlement.anchorTradingDate;
      fallback.marketBar.latestTradingDate = settlement.anchorTradingDate;
    }
    fallback.marketBar.settlementReason = settlement.reason;
    if (options?.statusTag !== undefined) {
      fallback.marketBar.marketStatusTag = options.statusTag;
    } else if (market === 'TW') {
      fallback.marketBar.marketStatusTag = 'NORMAL';
    }
    if (options?.currency) fallback.marketBar.currency = options.currency;
    if (options?.volumeUnit) fallback.marketBar.volumeUnit = options.volumeUnit;
    fallback.tdccDistribution = buildTdccDistribution(options?.tdccRecords, market, symbol, options?.us13fData);
    fallback.monthlyRevenue = buildMonthlyRevenue(symbol, name, market, options?.revenueRecords, options?.tdccRecords, {
      corporateActions: options?.corporateActions,
      dividendYield: options?.valuationData?.dividendYield,
      aumBillion: options?.etfMeta?.aumBillion,
      expenseRatio: options?.etfMeta?.expenseRatio,
      currentPrice: fallbackBasePrice,
      referenceDateStr: lastValidCandle?.date,
      metaType: options?.metaType,
      quarterlyFinancials: options?.quarterlyFinancials,
    });
    return fallback;
  }


  const count = effectiveCandles.length;
  const last = effectiveCandles[count - 1];
  const prev = effectiveCandles[count - 2];

  // 2. 逐根計算均線 (MA5, MA10, MA20, MA60)、KD、MACD、RSI
  const closes = effectiveCandles.map((c) => c.close);
  const highs = effectiveCandles.map((c) => c.high);
  const lows = effectiveCandles.map((c) => c.low);

  // EMA 與 MACD 輔助
  let ema12 = closes[0];
  let ema26 = closes[0];
  let dea9 = 0;
  // KD 輔助
  let currentK = 50;
  let currentD = 50;

  const klineCandles = effectiveCandles.map((c, i) => {
    // 均線
    const getSma = (period: number) => {
      if (i < period - 1) return undefined;
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j];
      }
      return Number((sum / period).toFixed(2));
    };

    const ma5 = getSma(5);
    const ma10 = getSma(10);
    const ma20 = getSma(20);
    const ma60 = getSma(60);
    const ma250 = getSma(250);

    // MACD 計算 (12, 26, 9)
    if (i > 0) {
      ema12 = (closes[i] * 2 + ema12 * 11) / 13;
      ema26 = (closes[i] * 2 + ema26 * 25) / 27;
    }
    const dif = Number((ema12 - ema26).toFixed(2));
    if (i === 0) {
      dea9 = dif;
    } else {
      dea9 = (dif * 2 + dea9 * 8) / 10;
    }
    const macdHist = Number(((dif - dea9) * 2).toFixed(2));

    // KD (9, 3, 3) 計算
    if (i >= 8) {
      let lowestLow = Infinity;
      let highestHigh = -Infinity;
      for (let j = i - 8; j <= i; j++) {
        if (lows[j] < lowestLow) lowestLow = lows[j];
        if (highs[j] > highestHigh) highestHigh = highs[j];
      }
      const rsv = highestHigh === lowestLow ? 50 : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      currentK = (currentK * 2 + rsv) / 3;
      currentD = (currentD * 2 + currentK) / 3;
    }

    // 簡易 RSI 14
    let rsi14: number | undefined = undefined;
    if (i >= 14) {
      let gain = 0;
      let loss = 0;
      for (let j = i - 13; j <= i; j++) {
        const diff = closes[j] - closes[j - 1];
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
      }
      if (gain === 0 && loss === 0) {
        rsi14 = 50;
      } else if (loss === 0) {
        rsi14 = 100;
      } else {
        const rs = gain / loss;
        rsi14 = Number((100 - 100 / (1 + rs)).toFixed(1));
      }
    }

    return {
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      transactions: c.transactions,
      isIntraday: c.isIntraday,
      ma5,
      ma10,
      ma20,
      ma60,
      ma250,
      k: Number(currentK.toFixed(1)),
      d: Number(currentD.toFixed(1)),
      dif,
      macd: Number(dea9.toFixed(2)),
      macdHist,
      rsi: rsi14,
    };
  });

  // 3. 計算三大關鍵水線
  // 主力成本：近 20 根典型價 Typical Price (H+L+C)/3 加權 VWAP（與 Card 07 / 微觀引擎口徑統一，Spec 0239 T09）
  const recent20 = effectiveCandles.slice(-20);
  let totalVol20 = 0;
  let totalVal20 = 0;
  recent20.forEach((c) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    totalVol20 += c.volume;
    totalVal20 += typicalPrice * c.volume;
  });
  const mainForceCost = totalVol20 > 0 ? Number((totalVal20 / totalVol20).toFixed(2)) : last.close;

  // 近 60 根最高與最低
  const recent60 = effectiveCandles.slice(-60);
  let maxHigh60 = -Infinity;
  let minLow60 = Infinity;
  recent60.forEach((c) => {
    if (c.high > maxHigh60) maxHigh60 = c.high;
    if (c.low < minLow60) minLow60 = c.low;
  });
  const highResistance = maxHigh60 > -Infinity ? maxHigh60 : Number((last.close * 1.08).toFixed(2));
  const supportLevel = minLow60 < Infinity ? minLow60 : Number((last.close * 0.92).toFixed(2));

  // 4. 計算頂部行情與盤中隔離 (Spec 0150)
  const anchorCandle = !settlement.isSettled && last?.isIntraday ? (prev ?? last) : last;
  let currentPrice: number;
  let change: number;
  let changePercent: number;
  let intradayQuote: { price: number; change: number; changePercent: number } | undefined = undefined;
  let settlementNotice: string | undefined = undefined;

  if (!settlement.isSettled) {
    // 尚未結算：頂部主看板行情一律以定錨日完整收盤價為準 (隔離盤中波動，Spec 0150)
    const prevAnchorCandle = last?.isIntraday ? (count >= 3 ? effectiveCandles[count - 3] : undefined) : prev;

    currentPrice = anchorCandle.close;
    change = prevAnchorCandle ? Number((anchorCandle.close - prevAnchorCandle.close).toFixed(2)) : 0;
    changePercent =
      prevAnchorCandle && prevAnchorCandle.close > 0 ? Number((((anchorCandle.close - prevAnchorCandle.close) / prevAnchorCandle.close) * 100).toFixed(2)) : 0;

    if (realtimeQuote?.price) {
      intradayQuote = {
        price: realtimeQuote.price,
        change: realtimeQuote.change ?? 0,
        changePercent: realtimeQuote.changePercent ?? 0,
      };
    }

    settlementNotice = `⚠️ 當前標的尚未收盤結算，為確保主力籌碼與 AI 模型之嚴謹性，本報告以 ${settlement.anchorTradingDate} 完整收盤數據為準。`;
  } else {
    // 已結算：採計最新行情
    currentPrice = realtimeQuote?.price ?? last.close;
    change =
      realtimeQuote?.change ?? Number((last.close - (prev ? prev.close : last.close)).toFixed(2));
    changePercent =
      realtimeQuote?.changePercent ??
      Number((prev && prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0).toFixed(2));
    intradayQuote = undefined;
    settlementNotice = undefined;
  }

  // 5. 三大法人籌碼管線 (前置計算以供 RiskSpider 與各子引擎連動)
  const defaultTemplate = createDefaultAiForceReport(symbol, name, market);
  const institutionalFlow = buildInstitutionalFlow(effectiveCandles, effectiveInstRecords, market);
  const recent5Flow = institutionalFlow.history.slice(-5);
  const sum5Inst = recent5Flow.reduce((acc, cur) => acc + cur.foreignShares + cur.trustShares + cur.dealerShares, 0);

  const sblBalance =
    options?.marginData?.sblBalance ??
    (effectiveInstRecords && effectiveInstRecords.length > 0
      ? [...effectiveInstRecords].reverse().find((r) => r.sblBalance != null)?.sblBalance
      : undefined);

  // 6. 調用各量化子引擎 (含雙市場量綱正規化與美股微結構注入, Spec 0239 T08)
  const usMicroScore = market === 'US' ? calculateUsMicrostructureInstitutionalScore(effectiveCandles as any) : 50;
  const usShortFloat = options?.us13fData?.shortFloatRatio;

  const volumeProfile = calculateVolumeProfile(effectiveCandles, currentPrice);
  const forecastCone = calculateForecastCone(effectiveCandles, currentPrice);
  const vwapCostStructure = calculateVwapCostStructure(effectiveCandles, currentPrice);
  const riskSpider = calculateRiskSpider(effectiveCandles, {
    institutionalNetVolume: institutionalFlow.history.length > 0 ? sum5Inst : undefined,
    turnoverRate: options?.marginData?.dayTradeRate,
    volumeInShares: market === 'TW',
    market,
    usMicroScore: market === 'US' ? usMicroScore : undefined,
  });
  const dayTradeRiskBase = calculateDayTradeRisk(effectiveCandles, {
    ...options?.marginData,
    sblBalance,
    market,
    shortFloatRatio: usShortFloat,
  });

  // 7. 主力語意與 Card 15 籌碼摘要計算
  const vwapBias = mainForceCost > 0 ? ((currentPrice - mainForceCost) / mainForceCost) * 100 : 0;

  let chipsSummary = defaultTemplate.chipsSummary;
  let usRvol: number | undefined = undefined;
  let usMfiScore: number | undefined = undefined;
  let usAtrPercent: number | undefined = undefined;

  if (market === 'US') {
    const avgVol20 = totalVol20 / Math.max(1, recent20.length);
    const rvol = avgVol20 > 0 ? Number((last.volume / avgVol20).toFixed(2)) : 1.0;

    // 14 日 ATR 與 MFI
    const atrWindow = effectiveCandles.slice(-15);
    let trSum = 0;
    let trCount = 0;
    let posMf = 0;
    let negMf = 0;
    for (let i = 1; i < atrWindow.length; i++) {
      const cur = atrWindow[i];
      const prv = atrWindow[i - 1];
      const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prv.close), Math.abs(cur.low - prv.close));
      trSum += tr;
      trCount++;
      const tp = (cur.high + cur.low + cur.close) / 3;
      const prevTp = (prv.high + prv.low + prv.close) / 3;
      const mf = tp * cur.volume;
      if (tp > prevTp) posMf += mf;
      else if (tp < prevTp) negMf += mf;
    }
    const atrValue = trCount > 0 ? Number((trSum / trCount).toFixed(2)) : Number((last.high - last.low).toFixed(2));
    const mfiScore =
      negMf === 0 ? (posMf > 0 ? 100 : 50) : Math.round(100 - 100 / (1 + posMf / negMf));
    usRvol = rvol;
    usMfiScore = mfiScore;
    usAtrPercent = currentPrice > 0 ? Number(((atrValue / currentPrice) * 100).toFixed(2)) : undefined;

    // 近 10 日 OBV 走勢
    let obv = 0;
    const obvSeries: number[] = [0];
    for (let i = 1; i < effectiveCandles.length; i++) {
      if (effectiveCandles[i].close > effectiveCandles[i - 1].close) obv += effectiveCandles[i].volume;
      else if (effectiveCandles[i].close < effectiveCandles[i - 1].close) obv -= effectiveCandles[i].volume;
      obvSeries.push(obv);
    }
    const sparklineHistory = obvSeries.slice(-10);

    const conclusionLabel =
      usMicroScore >= 65 ? '機構量價增溫' : usMicroScore <= 40 ? '機構調節降溫' : '量價動能中性';

    chipsSummary = {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      threeInstitutionsTotal: 0,
      verdictNote: `${last.date} 美股微觀動能評估 (${usMicroScore}分) | 已切換為機構量價評分`,
      conclusionBadge: usMicroScore >= 65 ? '機構量價偏多' : usMicroScore <= 40 ? '機構調節中' : '動能中性',
      sparklineHistory,
      isUsMarket: true,
      usMicroNote: '美股無三大法人日報，已切換為機構量價評分',
      usMicroMetrics: {
        rvol,
        vwapBiasPct: Number(vwapBias.toFixed(2)),
        mfiScore,
        atrValue,
        conclusionLabel,
      },
      asOfDateText: last.date,
    };
  } else if (institutionalFlow.history.length > 0) {
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    const foreignNetShares = lastInst.foreignShares;
    const trustNetShares = lastInst.trustShares;
    const dealerNetShares = lastInst.dealerShares;
    const threeInstitutionsTotal = foreignNetShares + trustNetShares + dealerNetShares;

    let conclusionBadge = '中性觀望';
    if (foreignNetShares > 0 && trustNetShares > 0) {
      conclusionBadge = '土洋合買';
    } else if (foreignNetShares < 0 && trustNetShares < 0) {
      conclusionBadge = '土洋齊賣';
    } else if (foreignNetShares * trustNetShares < 0) {
      conclusionBadge = '土洋對作';
    } else if (threeInstitutionsTotal > 200) {
      conclusionBadge = '偏多集結';
    } else if (threeInstitutionsTotal < -200) {
      conclusionBadge = '偏空調節';
    }

    const sparklineHistory = institutionalFlow.history
      .slice(-10)
      .map((h: { cumulativeTotalShares: number }) => h.cumulativeTotalShares);

    const calcConsecutiveDays = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const lastVal = arr[arr.length - 1];
      if (lastVal === 0) return 0;
      const sign = lastVal > 0 ? 1 : -1;
      let streak = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        if ((sign > 0 && arr[i] > 0) || (sign < 0 && arr[i] < 0)) streak++;
        else break;
      }
      return sign * streak;
    };

    const foreignConsecutiveDays = calcConsecutiveDays(institutionalFlow.history.map((h) => h.foreignShares));
    const trustConsecutiveDays = calcConsecutiveDays(institutionalFlow.history.map((h) => h.trustShares));

    chipsSummary = {
      foreignNetShares,
      trustNetShares,
      dealerNetShares,
      threeInstitutionsTotal,
      verdictNote: `${last.date} ${conclusionBadge} | 20日法人累計 ${institutionalFlow.cumulative20DaysSummary}`,
      conclusionBadge,
      sparklineHistory,
      asOfDateText: lastInst.date,
      foreignConsecutiveDays,
      trustConsecutiveDays,
      sblBalance,
      marginBalance: options?.marginData?.marginBalance,
      shortBalance: options?.marginData?.shortBalance,
    };
  } else {
    chipsSummary = {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      threeInstitutionsTotal: 0,
      verdictNote: `${last.date} 尚無法人日報數據`,
      conclusionBadge: '籌碼待補',
      sparklineHistory: [],
      asOfDateText: '法人資料待公布',
      sblBalance,
      marginBalance: options?.marginData?.marginBalance,
      shortBalance: options?.marginData?.shortBalance,
    };
  }

  const dayTradeRisk = {
    ...dayTradeRiskBase,
    isUsMarket: market === 'US',
    shortFloatRatio: usShortFloat,
    rvol: usRvol,
    atrPercent: usAtrPercent,
  };

  // 主力追踪總評判 (MLP-AI 雙市場語意合成 + 動態停損/停利/風報比, Spec 0239 T08)
  const lastKline = klineCandles[klineCandles.length - 1];
  const synthesizedVerdict = synthesizeMainForceVerdict({
    fiveDaysNetShares: sum5Inst,
    vwapBiasPercent: vwapBias,
    rsi: lastKline?.rsi ?? 50,
    market,
    usMicroScore: market === 'US' ? usMicroScore : undefined,
    rvol: usRvol,
    mfi: usMfiScore,
    shortFloatRatio: usShortFloat,
  });

  const recent5Candles = effectiveCandles.slice(-5);
  const totalVol5 = recent5Candles.reduce((acc, c) => acc + c.volume, 0);
  const avgVol5Raw = totalVol5 / Math.max(1, recent5Candles.length);
  const avgVolume5Lots = Math.round(market === 'TW' ? avgVol5Raw / 1000 : avgVol5Raw);

  const stopLossPrice =
    supportLevel > 0 && supportLevel < currentPrice
      ? Number(supportLevel.toFixed(2))
      : Number((currentPrice * 0.94).toFixed(2));
  const takeProfitPrice =
    highResistance > currentPrice
      ? Number(highResistance.toFixed(2))
      : Number((currentPrice * 1.08).toFixed(2));
  const riskDist = Math.max(0.01, currentPrice - stopLossPrice);
  const rewardDist = Math.max(0.01, takeProfitPrice - currentPrice);
  const riskRewardRatio = `1:${(rewardDist / riskDist).toFixed(1)}`;

  const mainForceVerdict = {
    ...synthesizedVerdict,
    stopLossPrice,
    takeProfitPrice,
    riskRewardRatio,
    avgVolume5Lots,
    isUsMarket: market === 'US',
  };

  // 8. Card 03 多維度判讀、Card 13 市場情緒與 Card 14 AI 信心度動態計算
  const multiDimensionRadar = calculateMultiDimensionRadar({
    candles: effectiveCandles,
    klineCandles,
    mainForceCost,
    institutionalFlow,
    market,
    volumeInShares: market === 'TW',
  });

  const totalVol5Lots = market === 'TW' ? totalVol5 / 1000 : totalVol5;
  const institutionalNetRatio = totalVol5Lots > 0 ? (sum5Inst / totalVol5Lots) * 100 : 0;
  const marginChangeRatio =
    options?.marginData?.marginBalance && options?.marginData?.marginBalanceChange
      ? (options.marginData.marginBalanceChange / options.marginData.marginBalance) * 100
      : 0;

  const marketSentiment = estimateMarketSentiment({
    priceChangePercent: changePercent,
    institutionalNetRatio,
    mainForceConcentration: vwapBias,
    marginChangeRatio,
  });
  marketSentiment.isUsMarket = market === 'US';

  // Spec 0239 T08: 嚴格雙市場宏觀隔離，徹底杜絕台股遭 usMacroData 劫持
  if (options?.macroData) {
    if (market === 'US') {
      const cnnRaw = options.macroData.cnn_fear_greed_score;
      const hasCnn = typeof cnnRaw === 'number' && Number.isFinite(cnnRaw);
      const cnnLabel = hasCnn
        ? cnnRaw >= 75
          ? '極度貪婪'
          : cnnRaw > 60
          ? '貪婪'
          : cnnRaw <= 25
          ? '極度恐懼'
          : cnnRaw < 40
          ? '恐懼'
          : '中性'
        : undefined;
      const vixNum =
        typeof options.macroData.vix_close === 'number' && Number.isFinite(options.macroData.vix_close)
          ? options.macroData.vix_close
          : undefined;
      const us10yNum =
        typeof options.macroData.treasury_yield_10y === 'number' &&
        Number.isFinite(options.macroData.treasury_yield_10y)
          ? options.macroData.treasury_yield_10y
          : undefined;
      marketSentiment.usMacroData = {
        cnnScore: hasCnn ? cnnRaw : undefined,
        cnnStateText: cnnLabel,
        cnnRatingText: cnnLabel,
        vixValue: vixNum,
        vix: vixNum,
        us10yYield: us10yNum,
        tenYearTreasury: us10yNum,
        asOfDateText: options.macroData.date ? `宏觀基準: ${options.macroData.date}` : undefined,
      };
    } else {
      marketSentiment.twMacroData = {
        putCallRatio:
          typeof options.macroData.tw_put_call_ratio === 'number'
            ? options.macroData.tw_put_call_ratio
            : undefined,
        foreignFuturesOi:
          typeof options.macroData.tw_foreign_futures_oi === 'number'
            ? options.macroData.tw_foreign_futures_oi
            : undefined,
        trustFuturesOi:
          typeof options.macroData.tw_trust_futures_oi === 'number'
            ? options.macroData.tw_trust_futures_oi
            : undefined,
        asOfDateText:
          options.macroData.tw_derivatives_as_of_date || options.macroData.date || undefined,
      };
    }
  }

  const aiConfidence = calculateAiConfidence({
    candles: effectiveCandles,
    klineCandles,
    hasInstitutionalData: institutionalFlow.history.length > 0,
    hasUsMicrostructure: market === 'US',
    volumeInShares: market === 'TW',
    market,
  });

  const healthSummary = calculateHealthSummaryFromCandles(
    klineCandles,
    institutionalFlow,
    market,
    market === 'US' ? usMicroScore : undefined
  );

  // 9. 白話文因果 XAI 生成 (Ticket 13)
  let xaiExplanation = '';
  if (market === 'TW') {
    const lastInst = institutionalFlow.history[institutionalFlow.history.length - 1];
    const cumInst = lastInst?.cumulativeTotalShares ?? 0;
    if (cumInst > 1000 && vwapBias > 0) {
      xaiExplanation = `因外資與投信近 20 日偏多集結 (+${cumInst.toLocaleString()}張)，且收盤價站穩主力成本線 (+${vwapBias.toFixed(1)}%)，量價微觀結構扎實，機構底倉厚實。`;
    } else if (cumInst < -1000 && vwapBias < 0) {
      xaiExplanation = `因三大法人持續擴大賣超調節 (${cumInst.toLocaleString()}張)，且跌破主力成本線 (${vwapBias.toFixed(1)}%)，籌碼呈現鬆動承壓，建議防禦觀望。`;
    } else if (vwapBias > 5) {
      xaiExplanation = `股價短線衝高大幅脫離主力成本線 (+${vwapBias.toFixed(1)}%)，技術指標偏熱，需留意獲利調節與拉回風險。`;
    } else {
      xaiExplanation = `當前股價於主力成本區間 (乖離 ${vwapBias >= 0 ? '+' : ''}${vwapBias.toFixed(1)}%) 震盪整理，法人買賣互見，等待方向表態。`;
    }
  } else {
    if (usMicroScore >= 70 && vwapBias > 0) {
      xaiExplanation = `因美股微觀資金流 (MFI/OBV) 呈現淨流入且分數達 ${usMicroScore} 分，股價突破長天期 VWAP 成本階梯 (+${vwapBias.toFixed(1)}%)，量價結構扎實，顯示機構資金主動吸籌。`;
    } else if (usMicroScore <= 40 || vwapBias < -3) {
      xaiExplanation = `因美股微觀量價動能偏弱 (評分 ${usMicroScore} 分) 且跌破長天期 VWAP 成本階梯 (${vwapBias.toFixed(1)}%)，資金呈淨流出態勢，機構承接意願保守。`;
    } else {
      xaiExplanation = `美股量價結構處於均線與 VWAP 附近中性整理 (評分 ${usMicroScore} 分)，動能指標多空平衡，建議觀察突破時機。`;
    }
  }

  const shortTermState =
    vwapBias > 3 ? '強勢上攻' : vwapBias > 0 ? '偏多築底' : vwapBias < -3 ? '弱勢探底' : '區間整理';
  const chipStructure =
    market === 'US'
      ? usMicroScore >= 65
        ? '機構吸籌'
        : usMicroScore <= 40
        ? '機構調節'
        : '量價平衡'
      : institutionalFlow.history.length > 0
      ? chipsSummary.conclusionBadge
      : '籌碼待補';

  return {
    ...defaultTemplate,
    symbol,
    name,
    market,
    updatedAt: last.date,
    isDataPending: false,

    marketBar: {
      currentPrice,
      change,
      changePercent,
      volumeShares: (() => {
        const rawVol = !settlement.isSettled
          ? anchorCandle.volume
          : (realtimeQuote?.volume ?? (realtimeQuote?.price && last.date !== settlement.anchorTradingDate ? undefined : last.volume));
        if (rawVol === undefined) return undefined;
        return market === 'TW' ? Math.round(rawVol / 1000) : rawVol;
      })(),
      transactionCount: realtimeQuote?.transactions !== undefined
        ? realtimeQuote.transactions
        : !settlement.isSettled
        ? (anchorCandle as any)?.transactions
        : (last as any)?.transactions,
      openPrice: !settlement.isSettled
        ? anchorCandle.open
        : (realtimeQuote?.open ?? (realtimeQuote?.price && last.date !== settlement.anchorTradingDate ? undefined : last.open)),
      highPrice: !settlement.isSettled
        ? anchorCandle.high
        : (realtimeQuote?.high ?? (realtimeQuote?.price && last.date !== settlement.anchorTradingDate ? undefined : last.high)),
      lowPrice: !settlement.isSettled
        ? anchorCandle.low
        : (realtimeQuote?.low ?? (realtimeQuote?.price && last.date !== settlement.anchorTradingDate ? undefined : last.low)),
      latestTradingDate: settlement.anchorTradingDate,
      dataPointsCount: count,
      dataSourceText:
        market === 'TW'
          ? '日 K TWSE | 法人 TWSE | 融資券 FinMind'
          : '日 K Yahoo Finance | 歷史報價',
      dataRangeText: `${effectiveCandles[0].date} ~ ${last.date}，共 ${count} 個交易日`,
      isSettled: settlement.isSettled,
      anchorTradingDate: settlement.anchorTradingDate,
      settlementReason: settlement.reason,
      marketStatusTag: options?.statusTag ?? (market === 'TW' ? 'NORMAL' : undefined),
      currency: options?.currency ?? (market === 'US' ? 'USD' : 'TWD'),
      volumeUnit: options?.volumeUnit ?? (market === 'US' ? '股' : '張'),
      intradayQuote,
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: true,
        marketStatus:
          Math.abs(changePercent) > 7 ? 'ALERT' : Math.abs(changePercent) > 3 ? 'VOLATILITY' : 'NORMAL',
        volatilityAlert: Math.abs(changePercent) > 5,
      },
    },

    klineSystem: {
      candles: klineCandles,
      keyLevels: {
        highResistance,
        mainForceCost,
        supportLevel,
      },
    },

    decisionCore: {
      ...defaultTemplate.decisionCore,
      settlementNotice,
      xaiExplanation,
      warningBadgeText:
        changePercent >= 0 && healthSummary.chipHealth >= 70 && dayTradeRisk.riskIndex < 45
          ? 'AI BULLISH'
          : healthSummary.chipHealth < 50 || dayTradeRisk.riskIndex >= 60 || changePercent < -3
          ? 'AI WARNING'
          : 'AI BALANCED',
      trendJudgement: (() => {
        const ma20 = lastKline?.ma20 ?? currentPrice;
        if (currentPrice >= ma20 && changePercent >= 0) return '偏多強勢';
        if (currentPrice >= ma20 && changePercent < 0) return '高檔震盪';
        if (currentPrice < ma20 && changePercent >= 0) return '跌深反彈';
        return '偏弱整理';
      })(),
      shortTermState,
      mainForceAction: mainForceVerdict.primaryVerb,
      chipStructure,
      dayTradeRiskPercent: dayTradeRisk.riskIndex,
      chipHealthScore: healthSummary.chipHealth,
      chipHealthLabel: healthSummary.chipHealth >= 70 ? '良好' : healthSummary.chipHealth >= 50 ? '普通' : '偏弱',
      supportRange: [supportLevel, Number((supportLevel * 0.95).toFixed(2))],
      resistanceRange: [highResistance, Number((highResistance * 1.05).toFixed(2))],
    },

    multiDimensionRadar,
    volumeProfile,
    forecastCone,
    vwapCostStructure,
    riskSpider,
    dayTradeRisk,
    institutionalFlow,
    chipsSummary,
    bullBearEnergy: calculateBullBearEnergyFromCandles(effectiveCandles),
    healthSummary,
    dynamicSignals: calculateDynamicSignalsFromCandles(klineCandles, mainForceCost, institutionalFlow, {
      market,
      usMicroScore: market === 'US' ? usMicroScore : undefined,
      shortFloatRatio: usShortFloat,
      dispositionStatus: options?.statusTag,
      marginBalance: options?.marginData?.marginBalance,
      marginBalanceChange: options?.marginData?.marginBalanceChange,
      dayTradeRate: options?.marginData?.dayTradeRate,
    }),
    marketSentiment,
    aiConfidence,
    forceDistribution: calculateForceDistributionFromCandles(klineCandles, last.date, institutionalFlow, market),
    bullBearStrength: calculateBullBearStrengthFromCandles(klineCandles),

    mainForceVerdict,

    tdccDistribution: buildTdccDistribution(options?.tdccRecords, market, symbol, options?.us13fData),
    monthlyRevenue: buildMonthlyRevenue(symbol, name, market, options?.revenueRecords, options?.tdccRecords, {
      corporateActions: options?.corporateActions,
      dividendYield: options?.valuationData?.dividendYield,
      aumBillion: options?.etfMeta?.aumBillion,
      expenseRatio: options?.etfMeta?.expenseRatio,
      currentPrice,
      referenceDateStr: last.date,
      metaType: options?.metaType,
      quarterlyFinancials: options?.quarterlyFinancials,
    }),
    valuationMetrics: (() => {
      const cleanSym = symbol.trim().toUpperCase().replace(/\.(TW|TWO|US)$/i, '');
      const pe = options?.valuationData?.pe ?? undefined;
      const forwardPe = options?.valuationData?.forwardPe ?? undefined;
      const pb = options?.valuationData?.pb ?? undefined;
      const psRatio = options?.valuationData?.psRatio ?? undefined;
      const isEtf = isEtfSymbol(symbol, name, market, options?.metaType);
      const isUsMarket = market === 'US';
      const derivedYield = isEtf
        ? deriveTrailingDividendYield(options?.corporateActions, currentPrice, last.date)
        : undefined;
      const dividendYield = options?.valuationData?.dividendYield ?? derivedYield;
      const netDividendYieldUs =
        isUsMarket && typeof dividendYield === 'number' && Number.isFinite(dividendYield)
          ? Number((dividendYield * 0.7).toFixed(2))
          : undefined;
      const latestEps = options?.valuationData?.eps ?? undefined;
      const isLossMaking =
        !isEtf &&
        ((typeof pe === 'number' && pe < 0) ||
          (typeof latestEps === 'number' && latestEps < 0));
      const liveExpenseRatio = options?.etfMeta?.expenseRatio ?? undefined;
      const etfExpenseRatio =
        isEtf
          ? liveExpenseRatio ??
            (options?.valuationData || options?.etfNav || derivedYield !== undefined || options?.etfMeta?.aumBillion != null
              ? ETF_BASELINE_META[cleanSym]?.expenseRatio
              : undefined)
          : undefined;

      const hasAnyStockValField =
        pe !== undefined ||
        forwardPe !== undefined ||
        pb !== undefined ||
        psRatio !== undefined ||
        dividendYield !== undefined ||
        latestEps !== undefined ||
        options?.valuationData?.grossMargin != null ||
        options?.valuationData?.operatingMargin != null ||
        options?.pledge?.pledge_ratio != null;

      const isEmpty = isEtf
        ? options?.etfNav == null &&
          etfExpenseRatio === undefined &&
          dividendYield === undefined &&
          options?.etfMeta?.aumBillion == null
        : !hasAnyStockValField;

      const percentileStats = isEtf
        ? { valuationTier: undefined, valuationTierText: undefined, sampleCount: 0 }
        : calculateValuationPercentile(pe, pb, options?.valuationData?.history || []);

      return {
        isEtf,
        isUsMarket,
        pe,
        forwardPe,
        pb,
        psRatio,
        dividendYield,
        netDividendYieldUs,
        isLossMaking,
        etfExpenseRatio,
        latestQuarterEps: latestEps,
        latestQuarterName: options?.valuationData?.quarterName ?? undefined,
        grossMargin: options?.valuationData?.grossMargin ?? undefined,
        operatingMargin: options?.valuationData?.operatingMargin ?? undefined,
        directorPledgeRatio: options?.pledge?.pledge_ratio ?? undefined,
        etfPremiumDiscountRate: options?.etfNav?.premiumDiscountRatio ?? undefined,
        asOfDateText: options?.valuationData?.asOfDate ?? options?.etfNav?.date ?? last.date,
        isEmpty,
        valuationTier: percentileStats.valuationTier,
        valuationTierText: percentileStats.valuationTierText,
        pePercentile: percentileStats.pePercentile,
        peMin: percentileStats.peMin,
        peMedian: percentileStats.peMedian,
        peMax: percentileStats.peMax,
        pbPercentile: percentileStats.pbPercentile,
        pbMin: percentileStats.pbMin,
        pbMedian: percentileStats.pbMedian,
        pbMax: percentileStats.pbMax,
        historySampleSize: percentileStats.sampleCount,
      };
    })(),
  };
}

/**
 * 機構級歷史估值百分位數 (Percentile Rank) 演算法 (Spec 0199 Ticket 03 / Spec 0239 T09)
 * 同時計算 PE 與 PB 分位數（不互斥），且僅於樣本數 >= 5 時標定估值位階
 */
export function calculateValuationPercentile(
  currentPe: number | null | undefined,
  currentPb: number | null | undefined,
  history: Array<{ pe?: number | null; pb?: number | null }> = []
): {
  peMin?: number;
  peMedian?: number;
  peMax?: number;
  pePercentile?: number;
  pbMin?: number;
  pbMedian?: number;
  pbMax?: number;
  pbPercentile?: number;
  valuationTier?: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';
  valuationTierText?: string;
  sampleCount: number;
} {
  const validPes = history
    .map((h) => h.pe)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  const validPbs = history
    .map((h) => h.pb)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  const getMedian = (arr: number[]): number | undefined => {
    if (arr.length === 0) return undefined;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(2));
  };

  const getPercentile = (val: number, arr: number[]): number => {
    if (arr.length === 0) return 50;
    const belowCount = arr.filter((x) => x < val).length;
    return Math.round((belowCount / arr.length) * 100);
  };

  const hasValidPe = typeof currentPe === 'number' && Number.isFinite(currentPe) && currentPe > 0;
  const hasValidPb = typeof currentPb === 'number' && Number.isFinite(currentPb) && currentPb > 0;

  const peStats =
    hasValidPe && validPes.length >= 1
      ? {
          peMin: validPes[0],
          peMax: validPes[validPes.length - 1],
          peMedian: getMedian(validPes),
          pePercentile: getPercentile(currentPe, validPes),
        }
      : {};

  const pbStats =
    hasValidPb && validPbs.length >= 1
      ? {
          pbMin: validPbs[0],
          pbMax: validPbs[validPbs.length - 1],
          pbMedian: getMedian(validPbs),
          pbPercentile: getPercentile(currentPb, validPbs),
        }
      : {};

  const primaryIsPe = peStats.pePercentile !== undefined;
  const primaryPr = primaryIsPe ? peStats.pePercentile : pbStats.pbPercentile;
  const sampleCount = primaryIsPe ? validPes.length : pbStats.pbPercentile !== undefined ? validPbs.length : 0;

  if (primaryPr !== undefined && sampleCount >= 5) {
    const prefix = primaryIsPe ? '自身歷史' : 'PB 自身歷史';
    let tier: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' = 'FAIR';
    let text = `${prefix}常態 (PR ${primaryPr}%)`;
    if (primaryPr <= 20) {
      tier = 'UNDERVALUED';
      text = `${prefix}偏低 (PR ${primaryPr}%)`;
    } else if (primaryPr >= 80) {
      tier = 'OVERVALUED';
      text = `${prefix}偏高 (PR ${primaryPr}%)`;
    }
    return {
      ...peStats,
      ...pbStats,
      valuationTier: tier,
      valuationTierText: text,
      sampleCount,
    };
  }

  return {
    ...peStats,
    ...pbStats,
    valuationTier: undefined,
    valuationTierText: sampleCount > 0 ? `樣本累積中 (${sampleCount} 日)` : '尚無歷史估值樣本',
    sampleCount,
  };
}

