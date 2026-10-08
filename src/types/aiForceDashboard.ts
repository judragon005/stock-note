import { MarketType } from './stock';

/**
 * 頂部行情 Bar 資料模型
 */
export interface MarketBarData {
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  volumeShares?: number; // 成交量 (張)
  transactionCount?: number; // 成交筆數
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  latestTradingDate: string; // YYYY-MM-DD
  dataPointsCount: number; // 資料筆數，例如 98 日
  dataSourceText: string; // 例如: "日 K TWSE | 法人 TWSE | 融資券 FinMind"
  dataRangeText: string; // 例如: "2026-05-04 ~ 2026-09-18，共 98 個交易日，法人資料 20 日"

  isSettled?: boolean; // 是否已達正式收盤且盤後數據結算完畢
  anchorTradingDate?: string; // 量化分析基準日 (YYYY-MM-DD)
  settlementReason?: string; // 未結算之說明提示
  marketStatusTag?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION'; // 注意股票或處置股票狀態標籤
  currency?: 'TWD' | 'USD'; // 標的計價幣別
  volumeUnit?: '張' | '股'; // 成交量單位
  intradayQuote?: {
    price: number;
    change: number;
    changePercent: number;
    updatedAt?: string;
  };
  statusBadges: {
    aiScanActive: boolean;
    mainForceTracking: boolean;
    marketStatus: 'NORMAL' | 'VOLATILITY' | 'ALERT';
    volatilityAlert: boolean;
  };
}

/**
 * 主 K 線週期切片模式
 */
export type KlinePeriodMode = '30D' | '60D' | '120D' | '250D';

/**
 * 主 K 線副圖指標切換模式
 */
export type SubchartIndicatorMode = 'VOL' | 'KD' | 'MACD' | 'RSI';

/**
 * 01 主 K 線單根資料項 (含均線與副圖技術指標)
 */
export interface KlineCandleItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  transactions?: number;
  isIntraday?: boolean;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma60?: number;
  ma250?: number; // MA250 (年線)
  k?: number; // KD 之 K 值 (0~100)
  d?: number; // KD 之 D 值 (0~100)
  dif?: number; // MACD 快線 DIF
  macd?: number; // MACD 慢線 DEA
  macdHist?: number; // MACD 柱狀體
  rsi?: number; // RSI (0~100)
}

/**
 * 01 主 K 線與關鍵價位
 */
export interface KlineSystemData {
  candles: KlineCandleItem[];
  keyLevels: {
    highResistance: number; // 高檔壓力區
    mainForceCost: number; // 主力成本
    supportLevel: number; // 支撐區
  };
}

/**
 * 02 AI 決策核心 (9 大維度)
 */
export interface DecisionCoreData {
  warningBadgeText: string; // "AI WARNING"
  trendJudgement: string; // "中性偏多"
  shortTermState: string; // "區間震盪"
  mainForceAction: string; // "調節減碼"
  chipStructure: string; // "中性"
  dayTradeRiskPercent: number; // 53%
  chipHealthScore: number; // 55
  chipHealthLabel: string; // "普通"
  supportRange: [number, number]; // [1875.0, 1730.0]
  resistanceRange: [number, number]; // [2490.0, 2490.0]
  riskHorizonDays: string; // "1~4 個交易日"
  settlementNotice?: string; // 尚未收盤結算時之警示橫幅文案
  xaiExplanation?: string; // 白話文因果判讀文案 (XAI)
}

/**
 * 03 多維度判讀 (6 維雷達)
 */
export interface MultiDimensionRadarData {
  overallScore: number; // 56
  overallGrade: 'A' | 'B' | 'C' | 'D'; // "C"
  dimensions: {
    institutional: number; // 法人
    trend: number; // 動態/趨勢
    chips: number; // 籌碼
    liquidity: number; // 流動性
    volatility: number; // 波動
    momentum: number; // 動能
  };
}

/**
 * 04 AI 籌碼熱區圖 (Volume Profile)
 */
export interface VolumeProfileBucket {
  label: string; // "壓力區" | "大量成交區" | "密集成交區" | "橫平區" | "支撐區"
  priceMin: number;
  priceMax: number;
  percentage: number; // 4, 17, 9, 9, 87 等
  type: 'resistance' | 'heavy' | 'dense' | 'flat' | 'support';
}

export interface HeatmapColumn {
  id: string;
  label: string;
  cells: string[];
}

export interface VolumeProfileData {
  buckets: VolumeProfileBucket[];
  bullBearFooterTag: string; // "多多多多多"
  priceTicks?: number[]; // 自適應 5 階 Y 軸價格刻度 (由大到小)
  heatmapColumns?: HeatmapColumn[]; // 4 欄週期熱力數據 (5日/10日/20日/60日)
}

/**
 * 05 風險雷達圖 (5 維蛛網)
 */
export interface RiskSpiderData {
  liquidityRisk: number; // 0-100
  volatilityRisk: number;
  trendRisk: number;
  institutionalRisk: number;
  chipRisk: number;
  mainForceRiskLevel: 'LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH'; // "中高"
  mainForceRiskIndex: number; // 60%
}

/**
 * 06 累積型 AI 預測路徑圖 (60日統計機率路徑)
 */
export interface ForecastConeData {
  bullishProb: number; // 47%
  rangeProb: number; // 11%
  bearishProb: number; // 42%
  mainForceDirectionProb: number; // 多頭 52%
  annualizedDriftPercent: number; // +19.7%
  timeNodes: {
    dayOffset: number; // 0, 3, 5, 10
    label: string; // "今日", "3日後", "5日後", "10日後"
    upperPrice: number;
    medianPrice: number;
    lowerPrice: number;
  }[];
}

/**
 * 07 主力成本結構分佈圖 - 時序成本帶成交量節點 (Spec 0144)
 */
export interface CostBandTimeNode {
  dateLabel: string; // e.g. "06/25", "07/10", "08/10", "08/31"
  inventoryVol: number; // 倉儲區 (>5%)
  trappedVol: number; // 套牢區 (-2~-5%)
  costVol: number; // 主力成本區 (±2%)
  heavyVol: number; // 大量成交區 (±2~5%)
  totalVolume: number;
}

/**
 * 07 主力成本結構分佈圖 (VWAP 面積堆疊)
 */
export interface VwapCostStructureData {
  mainForceVwap: number; // 2131 (20日 VWAP)
  biasPercent: number; // +7.5%
  bands: {
    name: string;
    biasLabel: string;
    percentage: number;
    color: string;
  }[];
  mainForceAvgCost?: number;
  referenceVwapLabel?: string;
  timeNodes?: CostBandTimeNode[];
}


/**
 * 08 法人行為計量 (三大法人雙軸與明細)
 */
export interface InstitutionalFlowData {
  history: {
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
    cumulativeTotalShares: number;
  }[];
  recentDaysTable: {
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
    totalShares: number;
  }[];
  cumulative20DaysSummary: string; // "多頭 (20日 +1,621張)"
  recent5DaysSummary: string; // "偏空 (-64張)"
  isUsMarket?: boolean;
  usMicrostructure?: {
    score: number;
    sentimentLabel: string;
    mfi: number;
    obvTrend: 'UP' | 'DOWN' | 'FLAT';
    volumeRatio: number;
    note: string;
  };
  asOfDateText?: string;
}

/**
 * 09 隔日沖風險分析
 */
export interface DayTradeRiskData {
  abnormalSelling: number; // 49%
  turnoverRate: number; // 57%
  dayTradeRatio: number; // 53%
  pullbackRisk: number; // 45%
  intradayVolatility: number; // 62%
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; // "中"
  riskIndex: number; // 53%
  marginBalance?: number; // 融資餘額 (張)
  shortBalance?: number; // 融券餘額 (張)
  shortMarginRatio?: number; // 券資比 (%)
  dayTradeRate?: number; // 當沖率 (%)
}

/**
 * 10 AI 多空能量儀
 */
export interface BullBearEnergyData {
  bullEnergyPercent: number; // 53%
  bearEnergyPercent: number; // 47%
  bullBearRatio: number; // 1.13
  bullBearConclusion: string; // "偏多"
  noteText: string; // "(20日紅K量/黑K量)"
}

/**
 * 11 健康度綜合評估表
 */
export interface HealthSummaryData {
  chipHealth: number; // 55%
  technicalStructure: number; // 80%
  capitalMomentum: number; // 58%
  liquidityRisk: number; // 5%
  institutionalSupport: number; // 50%
  overallRatingLabel: string; // "普通 (平均 50 分)"
}

/**
 * 12 AI 主力動態信號判斷
 */
export interface DynamicSignalsData {
  trendSignal: string; // "偏多偏強"
  chipSignal: string; // "籌碼中性"
  momentumSignal: string; // "動能偏強"
  riskSignal: string; // "波動高特偏高"
  verdictLight: 'GREEN' | 'YELLOW' | 'RED'; // "RED"
  verdictLabel: string; // "紅燈 (高風險)"
}

/**
 * 13 台股市場合情緒儀表板
 */
export interface MarketSentimentData {
  overallSentimentIndex: number; // 50
  sentimentState: 'FEAR' | 'NEUTRAL' | 'GREED'; // "中性"
  retailSentimentPercent: number; // 59%
  institutionalSentimentPercent: number; // 55%
  mainForceSentimentPercent: number; // 58%
}

/**
 * 14 AI 信心維度
 */
export interface AiConfidenceData {
  overallConfidence: number; // 47%
  modelAccuracy: number; // 32%
  dataCompleteness: number; // 100%
  signalStability: number; // 80%
  strategyApplicability: number; // 44%
}

/**
 * 15 籌碼具體摘要
 */
export interface ChipsSummaryData {
  foreignNetShares: number; // -166
  trustNetShares: number; // +89
  dealerNetShares: number; // +82
  threeInstitutionsTotal: number; // +5
  verdictNote: string; // "2026-09-18 短線偏空 | 追價風險可控"
  conclusionBadge: string; // "偏空震盪"
  sparklineHistory: number[]; // 近 10 日累計籌碼走勢
  isUsMarket?: boolean;
  usMicroNote?: string; // "美股無三大法人日報，已切換為機構量價評分"
  asOfDateText?: string;
}

/**
 * 16 買賣力分布圖
 */
export interface ForceDistributionData {
  largePlayerBuyPercent: number; // 65%
  retailBuyPercent: number; // 35%
  retailSellPressurePercent: number; // 36%
  asOfDateText: string; // "2026-09-18 (法人買進/賣出佔成交量比例，依 20 日平均)"
}

/**
 * 17 多空強度分布
 */
export interface BullBearStrengthData {
  bullStrengthPercent: number; // 58%
  bearStrengthPercent: number; // 42%
  volumeStrengthPercent: number; // 53%
  signalTierLevel: number; // 2 (1~5 級區)
  compositeScore: number; // 70
}

/**
 * 18 主力追蹤總評判 (MLP-AI)
 */
export interface MainForceVerdictData {
  primaryVerb: string; // "調節減碼"
  semanticTag: string; // "法人動作"
  fullVerdictText: string; // "AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。"
}

/**
 * 19 TDCC 集保千張大戶趨勢卡資料模型 (Card 19, Spec 0169)
 */
export interface TdccDistributionItem {
  date: string; // YYYY-MM-DD
  totalShareholders: number; // 總股東人數
  over1000Ratio: number; // 持股 > 1000 張大戶比率 (%)
  over400Ratio?: number; // 持股 > 400 張大戶比率 (%)
  under10Ratio?: number; // 持股 < 10 張散戶比率 (%)
}

export interface TdccDistributionData {
  history: TdccDistributionItem[];
  latestOver1000Ratio?: number;
  latestShareholders?: number;
  change4WeeksRatio?: number; // 近 4 週千張大戶持股比例變化率 (%，如 +1.25%)
  change4WeeksShareholders?: number; // 近 4 週股東人數變化 (如 -3210 人)
  concentrationBadge: string; // '籌碼高度集中 (波段起漲)' | '散戶接刀警戒' | '大戶持續增持' | '大戶明顯調節' | '籌碼中性整理' | '美股不適用'
  asOfDateText: string; // e.g. "集保基準日: 2026-10-02"
  isEmpty: boolean;
  emptyMessage?: string; // "美股無集保機制" | "集保數據累積中 (週五盤後結算)"
}

/**
 * 20 月營收與成長趨勢卡資料模型 (Card 20, Spec 0169 - 含 ETF 智慧自適應)
 */
export interface MonthlyRevenueItem {
  yearMonth: string; // YYYY-MM
  revenue: number; // 單月營業收入 (千元)
  lastYearRevenue?: number; // 去年同期營收 (千元)
  yoyRate?: number; // 營收年增率 YoY (%)
  momRate?: number; // 營收月增率 MoM (%)
  isAllTimeHigh?: boolean; // 是否創歷史新高
}

export interface EtfYieldItem {
  quarter: string; // e.g. "2026 Q3"
  amount: number; // 配息金額 (元)
  yieldRate: number; // 年化殖利率 (%)
}

export interface MonthlyRevenueData {
  isEtf: boolean;
  history: MonthlyRevenueItem[];
  latestRevenueText?: string; // "2,548 億元" 或 "5,620 萬元"
  latestYoyRate?: number; // +32.4%
  growthStreakMonths?: number; // 連續年月雙增月數
  athCount?: number; // 創歷史新高次數
  growthBadge: string; // '連續 3 個月年月雙增' | '創歷史新高 (ATH)' | '營收強勁雙位數成長' | '營收穩健成長' | '營收年減衰退' | 'ETF 規模穩健'
  asOfDateText: string; // e.g. "營收基準: 2026-09"
  etfData?: {
    aumBillion: number; // 資產規模 (十億 TWD 或 USD)
    dividendYield: number; // 平均殖利率 (%)
    beneficiaries: number; // 受益人人數 (人)
    quarterlyDividends: EtfYieldItem[];
  };
  isEmpty: boolean;
  emptyMessage?: string;
}

export type AiForceTaskTabKey =
  | 'TASK_1_COMPREHENSIVE'
  | 'TASK_2_TECHNICAL_ALERTS'
  | 'TASK_3_KD_MA'
  | 'TASK_4_MACD'
  | 'TASK_5_RAW_DATA';

/**
 * 全量聚合報表模型 (Single Source of Truth)
 */
export interface AiForceDashboardReport {
  symbol: string;
  name: string;
  market: MarketType;
  updatedAt: string;
  activeTaskTab: AiForceTaskTabKey;
  isDataPending?: boolean; // 是否處於無足夠歷史日 K 或數據回補中之待命狀態

  marketBar: MarketBarData;

  klineSystem: KlineSystemData;
  decisionCore: DecisionCoreData;
  multiDimensionRadar: MultiDimensionRadarData;
  volumeProfile: VolumeProfileData;
  riskSpider: RiskSpiderData;
  forecastCone: ForecastConeData;
  vwapCostStructure: VwapCostStructureData;
  institutionalFlow: InstitutionalFlowData;
  dayTradeRisk: DayTradeRiskData;
  bullBearEnergy: BullBearEnergyData;
  healthSummary: HealthSummaryData;
  dynamicSignals: DynamicSignalsData;
  marketSentiment: MarketSentimentData;
  aiConfidence: AiConfidenceData;
  chipsSummary: ChipsSummaryData;
  forceDistribution: ForceDistributionData;
  bullBearStrength: BullBearStrengthData;
  mainForceVerdict: MainForceVerdictData;

  // Spec 0169 新增 Card 19 & Card 20
  tdccDistribution: TdccDistributionData;
  monthlyRevenue: MonthlyRevenueData;
}
