/**
 * 智策精煉投資決策多維提示詞引擎型別契約 (Spec 0153 / Issue #135)
 * 對齊《個股分析大師核心模板 V12.0》與《ETF 分析大師核心模板 V3.0》
 */

import { MarketType } from './stock';

/**
 * 資產類別分流
 */
export type StrategicAssetClass = 'EQUITY' | 'ETF';

/**
 * 六頂思考帽維度列舉
 */
export type SixThinkingHatDimension =
  | 'WHITE'  // ⚪ 白帽：純客觀事實與數據 (硬數據，無主觀偏見)
  | 'RED'    // 🔴 紅帽：直覺情緒與市場心理 (散戶熱度、恐懼貪婪)
  | 'BLACK'  // ⚫ 黑帽：魔鬼代言人/紅隊批判 (致命風險、破位點、殺估值)
  | 'YELLOW' // 🟡 黃帽：核心價值與潛在催化劑 (超額利潤、成長預期)
  | 'GREEN'  // 🟢 綠帽：非對稱創新策略 (替代配置、金字塔建倉、對沖)
  | 'BLUE';  // 🔵 藍帽：元認知與風控紀律 (保本停損點、冷靜期、紀律清單)

/**
 * 提示詞導出模式
 */
export type StrategicPromptMode =
  | 'FULL_MASTER'    // 全維度 Master 智策投研報告 (含反思閘門)
  | 'SINGLE_HAT'     // 單一思考帽抽離模式 (例如專注於黑帽批判)
  | 'SEVEN_PILLARS'; // 7 大維度分拆檢視模式

/**
 * 零信任數據海關審計頭 (Data Customs Audit)
 */
export interface StrategicCustomsAudit {
  market: MarketType;
  anchorTradingDate: string; // YYYY-MM-DD
  settlementStatus: 'SETTLED_AFTER_HOURS' | 'INTRADAY_UNSETTLED';
  verificationTimestamp: string; // ISO 或 YYYY-MM-DD HH:mm:ss
  authenticityGuarantee: string; // "NO_MOCK_DATA_ZERO_TOLERANCE"
  isEtf: boolean;
}

/**
 * 行情與趨勢特徵切片
 */
export interface QuoteAndTrendDigest {
  symbol: string;
  name: string;
  market: MarketType;
  currentPrice: number;
  change: number;
  changePercent: number;
  volumeShares: number; // 張數或股數
  transactionsCount?: number; // 官方成交筆數
  maArrangement: 'BULLISH' | 'BEARISH' | 'ENTANGLED'; // 多頭排列 / 空頭排列 / 糾結
  ma20: number;
  ma60: number;
  ma250?: number;
  volumeRatio20D: number; // 今日量 / 20日均量
  isAllTimeHighOrLowNotice?: string;
}

/**
 * 籌碼與主力意圖特徵切片
 */
export interface ChipsAndMicrostructureDigest {
  foreignNetShares1D?: number; // 單日外資買賣超 (張/股)
  trustNetShares1D?: number; // 單日投信買賣超 (張/股)
  dealerNetShares1D?: number; // 單日自營商買賣超 (張/股)
  totalNetShares1D?: number; // 單日三大法人合計買賣超 (張/股)
  foreignNetShares20D?: number; // 近20日外資累計買賣超 (張/股)
  trustNetShares20D?: number; // 近20日投信累計買賣超 (張/股)
  dealerNetShares20D?: number; // 近20日自營商累計買賣超 (張/股)
  totalNetShares20D?: number; // 近20日三大法人合計累計買賣超 (張/股)
  institutionalStreakText?: string; // e.g. "外資連買 4 日 (+1,250張)"
  marginBalanceChangeText?: string; // e.g. "融資 5 日增加 820 張"
  marginBalance?: number; // 融資餘額 (張)
  shortBalance?: number; // 融券餘額 (張)
  dayTradeRatioPct?: number; // 當沖比率 (%)
  bigHolderRatioChange400?: number; // 400張大戶比例 (%)
  bigHolderRatioChange1000?: number; // 1000張大戶比例 (%)
  retailHolderCountChange?: number; // 散戶持股比例 (<10張) (%)
  mainForceVwap20D?: number; // 主力20日 VWAP 成本價
  currentVwapBiasPct?: number; // 現價相對主力成本乖離率 (%)
  boxResistancePrice?: number; // 箱頂壓力價位
  boxSupportPrice?: number; // 箱底防守價位
  limitUpPrice?: number; // 當日漲停價
  limitDownPrice?: number; // 當日跌停價
  marketStatusTag?: string; // 'NORMAL' | 'ATTENTION' | 'DISPOSITION' (市場監理狀態)
  isCyclical?: boolean; // 景氣循環股識別標記 (記憶體/半導體/原物料等)
  unitText?: string; // 計量單位文字 (e.g. "張" 或 "股")
  turnoverAmountTwdHundredMillion?: number; // 當日成交金額 (億元)
  microstructureSummary?: string; // 美股量能/動能微觀結構摘要
}

/**
 * 基本面與營收特徵切片 (個股專用)
 */
export interface FundamentalAndEarningsDigest {
  pe?: number;
  pb?: number;
  dividendYield?: number;
  monthlyRevenueYearMonth?: string;
  monthlyRevenueYoY?: number;
  monthlyRevenueMoM?: number;
  isMonthlyRevenueAllTimeHigh?: boolean;
  revenueTrendSummary?: string; // e.g. "月營收連 3 個月雙位數成長"
  grossMarginPct?: number;
  operatingMarginPct?: number;
  netMarginPct?: number;
  roePct?: number;
  roaPct?: number;
  freeCashFlowSummary?: string;
  directorPledgeRatioPct?: number; // 董監質押比例 (%)
  governanceRiskWarning?: string; // 質押過高或申報轉讓警告
}

/**
 * ETF 穿透與治理特徵切片 (ETF 專用)
 */
export interface EtfGovernanceAndLookThroughDigest {
  category: 'CORE_MARKET' | 'HIGH_DIVIDEND' | 'THEMATIC' | 'BOND'; // 市值型 / 股息型 / 主題型 / 債券型
  weightMatrix: {
    indexQuality: number;
    governance: number;
    costEfficiency: number;
    practicalDecision: number;
  };
  totalExpenseRatioPct?: number; // TER 總費用率 (%)
  trackingDifferencePct?: number; // 追蹤偏離 (TD)
  discountPremiumPct?: number; // 市價折溢價 (%)
  dividendSmoothingPolicy?: string; // 是否有平準金
  topHoldings: Array<{ symbol: string; name: string; weightPct: number }>;
  topSectorConcentration?: string; // e.g. "半導體 58.4%"
}

/**
 * 宏觀環境與市場流動性切片
 */
export interface MacroAndSentimentDigest {
  treasuryYield10Y?: number; // 10年期美債殖利率 (%)
  yieldSpread10Y2Y?: number; // 10Y-2Y 殖利率利差 (%)
  cnnFearGreedScore?: number; // CNN 恐懼貪婪 (0-100)
  vixClose?: number; // VIX
  twPutCallRatio?: number; // 台指期 P/C Ratio
  macroRegimeText: string; // 宏觀環境一句話總結
}

/**
 * 特徵語意壓縮層完整模型 (StrategicFactDigest)
 */
export interface StrategicFactDigest {
  audit: StrategicCustomsAudit;
  quote: QuoteAndTrendDigest;
  chips: ChipsAndMicrostructureDigest;
  macro: MacroAndSentimentDigest;
  fundamental?: FundamentalAndEarningsDigest; // 個股存在
  etf?: EtfGovernanceAndLookThroughDigest; // ETF 存在
  desensitizedPortfolioContext?: {
    status?: 'IN_POSITION' | 'ZERO_POSITION';
    portfolioWeightPct?: number; // 持倉佔總資金比 (0~100%)
    holdingHorizonDays?: number; // 已持有天數
    unrealizedGainLossSign?: 'PROFIT' | 'LOSS' | 'BREAKEVEN'; // 僅輸出正負，不洩漏金額
    unrealizedPnLPercent?: number; // 未實現報酬率 %
    avgCost?: number; // 平均買進成本 (非脫敏時輸出)
    breakevenPrice?: number; // 精確保本價 (非脫敏時輸出)
  };
  warRoomFeatures?: {
    maArrangement?: string;
    foreignNetDays?: number;
    foreignNetShares?: number;
    investmentTrustNetShares?: number;
    marginTrend?: 'INCREASING' | 'DECREASING' | 'STABLE';
    tdccLargeShareholdersPct?: number;
    dayTradeRiskLevel?: string;
    statusTag?: string;
    settledDate?: string;
    intradayTime?: string;
  };
  valuationStatus?: {
    tier?: string;
    pe?: number;
    pb?: number;
    ps?: number;
    yield?: number;
    discountPremium?: number;
    isLossMaking?: boolean;
  };
}

/**
 * 提示詞生成選項
 */
export interface StrategicPromptOptions {
  mode: StrategicPromptMode;
  targetHat?: SixThinkingHatDimension; // 若 mode 為 SINGLE_HAT 時指定
  desensitized: boolean; // 是否啟用隱私脫敏 (預設 true)
  userPortfolioWeightPct?: number; // 投資人部位佔比 (選填)
  userNotes?: string; // 投資人自訂研究筆記 (選填)
}

/**
 * 提示詞生成最終結果
 */
export interface StrategicPromptResult {
  symbol: string;
  name: string;
  assetClass: StrategicAssetClass;
  promptText: string;
  estimatedTokens: number;
  customsAudit: StrategicCustomsAudit;
  activeMode: StrategicPromptMode;
  targetHat?: SixThinkingHatDimension;
}
