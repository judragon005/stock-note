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

export type USFeeType = 'ZERO_COMMISSION' | 'SUB_BROKERAGE';

export interface BrokerAccount {
  id: string;                      // 唯一識別碼 (如 'broker-tw-default', 'broker-cathay', 'broker-schwab')
  name: string;                    // 券商/帳戶名稱 (如 '國泰證券 (2.8折)', '永豐大戶投 (2折)', '嘉信理財 (免手續費)')
  market: MarketType;              // 'TW' | 'US'
  feeRate: number;                 // 標準手續費率 (台股 0.001425, 美股複委託 0.001)
  discountRate: number;            // 折讓率 (如 0.28, 0.2, 0.6, 1.0)
  minFee: number;                  // 最低手續費門檻 (如 1, 20, 0, 15 USD)
  taxRate: number;                 // 證交稅率 (現股 0.003, ETF 0.001)
  usFeeType?: USFeeType;           // 美股類型 ('ZERO_COMMISSION' | 'SUB_BROKERAGE')
  isDefault?: boolean;             // 是否為該市場之預設帳戶
  color?: string;                  // 帳戶標籤主題色
  createdAt?: number;
}

export interface FrictionSummary {
  totalBuyFee: number;                  // 歷史累計買進手續費
  totalSellFee: number;                 // 歷史累計賣出手續費
  totalSellTax: number;                 // 歷史累計賣出證交稅
  totalRealizedFriction: number;        // 歷史已付總摩擦成本 (買手續費 + 賣手續費 + 賣證交稅)
  totalFeeSavedByDiscount: number;      // 歷史券商折讓累計節省金額
  totalEstimatedFutureFriction: number; // 當前在庫持股預估未來出清摩擦成本 (預估稅 + 預估費)
  totalEstimatedFutureTax: number;      // 預估未來出清證交稅
  totalEstimatedFutureFee: number;      // 預估未來出清手續費
  frictionImpactPercent: number;        // 摩擦成本佔 (毛市值 + 已實現利得) 之衝擊比例 %
}

export interface TradeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string; // e.g. 2330, AAPL, NVDA, 0050, 9927
  name?: string; // e.g. 台積電, 泰銘
  market: MarketType;
  currency: Currency;
  type: TradeType;
  accountId?: string; // 所屬券商帳戶 ID (如 'broker-tw-default', 'broker-cathay')
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

export type AccountingView = 'BROKER' | 'TOTAL_RETURN'; // BROKER: 券商核帳模式（不含息、含稅）; TOTAL_RETURN: 總報酬模式（含息、毛市值）

export interface HoldingPosition {
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  accountId?: string; // 所屬券商帳戶 ID
  accountName?: string; // 所屬券商帳戶名稱
  shares: number; // 當前持有股數
  originalBuyShares?: number; // 原始買進與增資累計股數（未含配股/減資調整）
  avgCost: number; // 平均買進每股成本
  totalCostBasis: number; // 總投入成本（含買進手續費與認購金額，減去減資退還）
  adjustedCostBasis: number; // 經資本返還與股息調整後之本金基準
  currentPrice: number; // 最新參考市價
  marketValue: number; // 總市值 (相容性主欄位：依當前模式為 netMarketValue 或 grossMarketValue)
  grossMarketValue: number; // 毛市值 (shares * currentPrice)
  estimatedSellTax: number; // 預估賣出證券交易稅
  estimatedSellFee: number; // 預估賣出手續費
  netMarketValue: number; // 含稅淨變現市值 (grossMarketValue - estimatedSellTax - estimatedSellFee)
  unrealizedPnL: number; // 未實現損益金額
  unrealizedPnLPercent: number; // 未實現報酬率 %
  unrealizedPnLBroker: number; // 券商口徑未實現損益 (netMarketValue - totalCostBasis)
  unrealizedPnLBrokerPercent: number; // 券商口徑報酬率 %
  realizedPnL: number; // 累計已實現損益（此標的歷史賣出累積）
  totalDividends: number; // 累計領取現金股息
  totalCapitalReturned: number; // 累計減資退還現金
  totalStockDividendsShares: number; // 累計除權配股股數
  totalReturnPnL: number; // 含息總損益 ((grossMarketValue - totalCostBasis) + totalDividends + realizedPnL)
  totalReturnPercent: number; // 含息總報酬率 %
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

export type ExchangeRateStatus = 'REALTIME' | 'DELAYED' | 'PREVIOUS_CLOSE' | 'CACHED' | 'FALLBACK';

export interface ExchangeRateQuote {
  rate: number;
  prevClose?: number;
  change?: number;
  changePercent?: number;
  status: ExchangeRateStatus;
  updatedAt: number;
  source: 'YAHOO' | 'CACHE' | 'FALLBACK';
}

export interface PriceMetadataStore {
  quotes: Record<string, PriceQuote>;
  lockedSymbols: string[];
  lastGlobalUpdate?: number;
  exchangeRateQuote?: ExchangeRateQuote;
}

export interface MarketSummarySlice {
  totalCost: number;
  marketValue: number;
  grossMarketValue: number;
  netMarketValue: number;
  estimatedSellTax: number;
  estimatedSellFee: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalDividends: number;
  totalCapitalReturned: number;
  totalReturnPnL: number;
  totalReturnPercent: number;
}

export interface PortfolioSummary {
  twd: MarketSummarySlice;
  usd: MarketSummarySlice;
  combinedTWD: MarketSummarySlice & { netAssetValue: number };
  usdToTwdRate: number;
}




