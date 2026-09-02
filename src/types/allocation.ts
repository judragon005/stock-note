import { MarketType, Currency } from './stock';

export type TargetAllocationType = 'MARKET' | 'SYMBOL';

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
