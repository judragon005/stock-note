import { MarketType, Currency } from './stock';

export type TargetAllocationType = 'MARKET' | 'SYMBOL' | 'ASSET_CLASS';

/**
 * Zavy 慢富大類資產分類
 */
export type AssetClassCategory =
  | 'EQUITY'          // 股票型 (市值核心、高股息、衛星個股)
  | 'BOND_GOV'        // 純政府公債 (長/中/短天期純防彈衣)
  | 'BOND_CORP_IG'    // 投資級公司債 (防禦性風險資產)
  | 'GOLD'            // 黃金貴金屬
  | 'REITS'           // 權益型房地產信託
  | 'CASH';           // 現金儲備

export type AssetClassSubCategory =
  | 'EQUITY_CORE'        // 市值型核心 (0050, 006208, VTI, VOO, VT 等)
  | 'EQUITY_DIVIDEND'    // 高股息 (00878, 00919, 00929, VYM, SCHD 等)
  | 'EQUITY_SATELLITE'   // 波段衛星/個股 (2330, NVDA, AAPL 等)
  | 'BOND_GOV_LONG'      // 長天期美債 (20Y+, 00679B, 00687B, 00795B, TLT 等)
  | 'BOND_GOV_MID'       // 中天期公債 (7-10Y, 00697B, IEF, VGIT 等)
  | 'BOND_GOV_SHORT'     // 短天期公債/國庫券 (1-3Y / 0-3M, 00719B, 00865B, SHY, SGOV, BIL 等)
  | 'BOND_CORP_IG'       // 投資級公司債 (00720B, 00725B, 00751B, 00772B, 00937B, LQD 等)
  | 'GOLD'               // 黃金 (00635U, GLD, IAU 等)
  | 'REITS_EQUITY'       // 權益型 REITs (VNQ, IYR 等)
  | 'CASH'               // 現金
  | 'EXCLUDED';          // 剔除高危/投機標的 (槓桿反向、抵押權型 mREITs 等)

export type AssetExclusionReason =
  | 'LEVERAGED_INVERSE'  // 槓桿與反向型 ETF (00631L, 00632R, TQQQ, SQQQ 等)
  | 'MORTGAGE_REIT'      // 抵押權型 mREITs (00712, NLY, AGNC 等)
  | 'SPECULATIVE';       // 投機/高風險

export interface AssetClassClassification {
  category: AssetClassCategory;
  subCategory: AssetClassSubCategory;
  isExcluded: boolean;
  exclusionReason?: AssetExclusionReason;
  warningMessage?: string;
  isTrueDefensive: boolean; // 是否為真避險防彈衣 (BOND_GOV, GOLD, CASH)
}

/**
 * ETF 即時/日度折溢價狀態與守門員結果
 */
export type EtfNavPremiumStatus = 'NORMAL' | 'ELEVATED_PREMIUM_WARNING' | 'HIGH_PREMIUM_RISK';

export interface EtfNavPremiumValidationResult {
  symbol: string;
  premiumRate: number;              // 溢價率 % (例如 1.2 代表 +1.2%)
  status: EtfNavPremiumStatus;      // 'NORMAL' | 'ELEVATED_PREMIUM_WARNING' | 'HIGH_PREMIUM_RISK'
  isBlocked: boolean;              // 是否攔截買進 (例如 premiumRate > 1.0%)
  warningMessage?: string;          // 警示說明
  suggestedAlternatives?: string[]; // 建議同類型平價替代標的
}

export interface TargetAllocationItem {
  key: string;               // 市場 ('TW' | 'US' | 'CASH') 或 股票代碼 ('2330' | '0050' | 'AAPL')
  name?: string;            // 標的名稱 (如 '台積電', '美股部位', '現金儲備')
  targetPercent: number;    // 目標百分比 (例如 40 代表 40%)
}

export interface TargetAllocationConfig {
  id: string;
  type: TargetAllocationType;    // 'MARKET' (市場層級) 或 'SYMBOL' (個股層級)
  name: string;                  // 策略名稱 (例如: '核心股債 6:4', '科技股成長配置')
  items: TargetAllocationItem[]; // 各項目比例清單 (各項之和應為 100%)
  toleranceBandPercent: number;  // 偏離容忍門檻 % (預設 5.0 代表 ±5%)
  updatedAt: number;
}

export type RebalanceMode = 'CASH_IN' | 'FULL_REBALANCE';
export type RebalanceItemStatus = 'BALANCED' | 'MILD_DRIFT' | 'SEVERE_DRIFT';
export type RebalanceAction = 'BUY' | 'SELL' | 'HOLD';

export interface RebalanceItemRecommendation {
  key: string;                       // 標的代碼或市場 ('TW' / 'US' / 'CASH' 或 '2330')
  name: string;                      // 標的名稱
  market?: MarketType;
  currency: Currency;
  currentPrice: number;              // 當前市價 (現金為 1)
  currentValueTwd: number;           // 當前市值 (折合 TWD)
  currentPercent: number;            // 當前實際佔比 %
  targetPercent: number;             // 目標佔比 %
  driftPercent: number;              // 偏離度 % (currentPercent - targetPercent)
  status: RebalanceItemStatus;       // 偏離健康度 (BALANCED / MILD_DRIFT / SEVERE_DRIFT)
  action: RebalanceAction;           // 建議動作 (BUY / SELL / HOLD)
  recommendedAmountTwd: number;       // 建議調整金額 (TWD)
  recommendedAmountOriginal: number;  // 建議調整金額 (原幣別)
  recommendedShares: number;          // 建議調整股數 (美股支援小數，台股整股/零股)
  recommendedLotsSummary?: string;    // 例如: '2 張 + 350 股' (台股)
}

export interface RebalancePlanResult {
  mode: RebalanceMode;
  totalPortfolioValueTwd: number;     // 調整前總市值 (含現金)
  newTotalValueTwd: number;           // 注水後或調整後總市值
  cashInflowTwd: number;              // 本次注水加碼金額 (TWD)
  isFullyBalanced: boolean;           // 是否全數處於容忍區間內
  toleranceBandPercent: number;       // 所套用之容忍門檻 %
  recommendations: RebalanceItemRecommendation[];
  summary: {
    totalBuyAmountTwd: number;
    totalSellAmountTwd: number;
    estimatedFrictionTwd: number;      // 預估手續費與交易稅等摩擦成本
  };
}

// ==========================================
// Zavy 慢富大類資產再平衡與股息活水轉向 (Spec 0221 Ticket 03)
// ==========================================

export type ZavyRebalanceStrategyMode =
  | 'NORMAL'              // 常規全量再平衡 (買賣調倉)
  | 'CONTRIBUTION_ONLY'   // 僅新現金注水加碼低配資產 (不賣存量)
  | 'DIVIDEND_REDIRECT';  // 股息活水轉向 (以存量產生之股利導流補齊低配防彈衣)

export interface DividendRedirectTarget {
  category: AssetClassCategory;
  suggestedSymbol: string;
  suggestedName: string;
  allocatedAmountTwd: number;
  allocationPercent: number;
  rationale: string;
}

export interface DividendRedirectPlan {
  annualEstimatedDividendsTwd: number;
  monthlyAverageDividendTwd: number;
  targets: DividendRedirectTarget[];
  guidanceMessage: string;
}

export interface DebtRepaymentRecommendation {
  hasActiveLoans: boolean;
  totalLoanPrincipalTwd: number;
  recommendedRepaymentAmountTwd: number;
  rationale: string;
}

export interface WaterfallSellTierItem {
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  symbol: string;
  name: string;
  marketValueTwd: number;
  shares: number;
  isPledged: boolean;
  pledgedShares: number;
  unpledgedShares: number;
  canSell: boolean;
  reason: string;
}

export interface AssetClassRebalancePlanResult extends RebalancePlanResult {
  strategyMode: ZavyRebalanceStrategyMode;
  assetClassRecommendations: RebalanceItemRecommendation[];
  dividendRedirectPlan?: DividendRedirectPlan;
  debtRepayment?: DebtRepaymentRecommendation;
  waterfallSellSuggestions?: WaterfallSellTierItem[];
}
