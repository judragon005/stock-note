export type MarketType = 'TW' | 'US';
export type Currency = 'TWD' | 'USD';
export type TradeType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'STOCK_DIVIDEND'
  | 'STOCK_SPLIT'
  | 'CAPITAL_REDUCTION'
  | 'CAPITAL_INCREASE'
  | 'STOCK_MERGER'          // 換股合併 / 股份轉換
  | 'PREFERRED_REDEMPTION'   // 特別股贖回 / 到期收回
  | 'SPIN_OFF'               // 企業分拆獨立上市
  | 'CB_CONVERSION'          // 可轉債換股普通股
  | 'TENDER_OFFER';          // 公開收購 / 私有化下市

export interface TradeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string; // e.g. 2330, AAPL, NVDA, 0050, 9927
  name?: string; // e.g. 台積電, 泰銘
  market: MarketType;
  currency: Currency;
  type: TradeType;
  shares: number; // 股數（美股支援小數，公司行動時為變更股數或認購股數）
  price: number; // 每股單價（原始幣別，公司行動時為認購價或每股配發/退款金額）
  fee: number; // 手續費
  tax: number; // 證交稅 / 扣繳稅額
  ratio?: number; // 比例（如股票分割比例 10、減資比例 0.2828、配股率 0.05、換股比例 1.2）
  cashAmount?: number; // 退還或入帳總現金金額（如減資退款總額、現金補貼）
  exDate?: string; // 基準日 / 除權息日 (YYYY-MM-DD)
  targetSymbol?: string; // 換股目標標的代碼 (STOCK_MERGER) 或分拆新公司代碼 (SPIN_OFF)
  targetName?: string; // 目標標的名稱
  allocationRatio?: number; // 分拆成本分攤比例 (如 0.2 代表拆出 20% 成本給新標的)
  conversionPrice?: number; // 可轉債轉換價格
  note?: string; // 交易備註
  tags?: string[]; // 標籤（如：長期核心、波段動能、股息成長）
  createdAt: number;
}

export interface HoldingPosition {
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  shares: number; // 當前持有股數
  originalBuyShares?: number; // 原始買進與增資累計股數（未含配股/減資調整）
  avgCost: number; // 平均買進每股成本
  totalCostBasis: number; // 總投入成本（含買進手續費與認購金額，減去減資退還）
  adjustedCostBasis: number; // 經資本返還調整後之實際在倉本金基準
  currentPrice: number; // 最新參考市價
  marketValue: number; // 當前總市值 (shares * currentPrice)
  unrealizedPnL: number; // 未實現損益金額 (marketValue - totalCostBasis)
  unrealizedPnLPercent: number; // 未實現報酬率 %
  realizedPnL: number; // 累計已實現損益（此標的歷史賣出累積）
  totalDividends: number; // 累計領取現金股息
  totalCapitalReturned: number; // 累計減資退還現金
  totalStockDividendsShares: number; // 累計除權配股股數
  yieldOnCostPercent: number; // 成本殖利率 % (totalDividends / totalCostBasis * 100)
}

export type ColorThemeMode = 'taiwan' | 'international'; // taiwan: 紅漲綠跌, international: 綠漲紅跌

export type PriceQuoteStatus = 'REALTIME' | 'DELAYED' | 'PREVIOUS_CLOSE' | 'MANUAL_LOCKED' | 'CACHED' | 'ERROR';

export interface PriceQuote {
  symbol: string;
  market: MarketType;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  currency: Currency;
  status: PriceQuoteStatus;
  updatedAt: number; // Unix timestamp in ms
  source: 'YAHOO' | 'TWSE' | 'MANUAL' | 'CACHE';
}

export interface PriceMetadataStore {
  quotes: Record<string, PriceQuote>;
  lockedSymbols: string[];
  lastGlobalUpdate?: number;
}

export interface MarketSummarySlice {
  totalCost: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalDividends: number;
  totalCapitalReturned: number;
}

export interface PortfolioSummary {
  twd: MarketSummarySlice;
  usd: MarketSummarySlice;
  combinedTWD: MarketSummarySlice & { netAssetValue: number };
  usdToTwdRate: number;
}


