export type MarketType = 'TW' | 'US';
export type Currency = 'TWD' | 'USD';
export type TradeType =
  | 'BUY'
  | 'SELL'
  | 'MARGIN_BUY'          // 融資買進 (資買，自備款 40%)
  | 'MARGIN_SELL'         // 融資賣出 / 償還融資 (資賣)
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

export type TaxRateCategory = 'STOCK_REGULAR' | 'DAY_TRADING' | 'STOCK_ETF' | 'BOND_ETF_TAX_FREE' | 'CUSTOM';

export interface FrictionSummary {
  totalBuyFee: number;                  // 歷史累計買進手續費 (折算 TWD)
  totalSellFee: number;                 // 歷史累計賣出手續費 (折算 TWD)
  totalSellTax: number;                 // 歷史累計賣出證交稅
  totalUSDividendTax?: number;          // 美股現金股利 30% 預扣稅累計 (USD)
  totalUSDividendTaxInTWD?: number;     // 美股現金股利 30% 預扣稅折算台幣累計 (TWD)
  totalTWDividendTax?: number;          // 台股現金股利二代健保補充保費 (2.11%) 累計 (TWD)
  totalRealizedFriction: number;        // 歷史已付總摩擦成本 (買費 + 賣費 + 賣稅 + 股息預扣稅/健保費，折算 TWD)
  totalFeeSavedByDiscount: number;      // 歷史券商折讓累計節省金額 (以法定牌告 20 元低消為基準，TWD)
  totalEstimatedFutureFriction: number; // 當前在庫持股預估未來出清摩擦成本 (預估稅 + 預估費，折算 TWD)
  totalEstimatedFutureTax: number;      // 預估未來出清證交稅 (折算 TWD)
  totalEstimatedFutureFee: number;      // 預估未來出清手續費 (折算 TWD)
  frictionImpactPercent: number;        // 摩擦成本佔 (毛市值 + 已實現利得) 之衝擊比例 %
}

// ==========================================
// 主動交易計畫、風控與量化模型 (Trade Discipline & Risk Models)
// ==========================================

export interface TradePlan {
  entryReason?: string;             // 進場理由 / 交易假說 (如：突破箱頂、籌碼集中、跌深反彈)
  stopLossPrice?: number;           // 預設停損價
  takeProfitPrice?: number;         // 預設停利價
  plannedRiskRewardRatio?: number;  // 預計風報酬比 (R:R Ratio)
}

export type TradeMistakeType =
  | 'CHASE_HIGH'        // 追高追價
  | 'HOLD_LOSER'         // 凹單不肯停損
  | 'PREMATURE_PROFIT'  // 過早停利飛走
  | 'EMOTIONAL_SIZE'    // 情緒化重押
  | 'NO_PLAN'           // 盲目無計畫進場
  | 'OTHER';            // 其他

export interface TradeReview {
  isPlanFollowed: boolean;          // 是否嚴格遵守計畫出場
  mistakesMade?: TradeMistakeType[];// 犯錯行為 (追高、凹單、過早停利、情緒化加碼)
  lessonsLearned?: string;          // 覆盤得失與心得
  disciplineScore: number;          // 紀律評分 (1 ~ 5 星)
  reviewedAt: number;               // 覆盤時間戳
}

export type RiskAlertStatus =
  | 'NORMAL'                 // 正常區間
  | 'NEAR_STOP_LOSS'         // 接近停損 (距離 <= 3%)
  | 'STOP_LOSS_TRIGGERED'    // 觸及/跌破停損 (🚨)
  | 'NEAR_TAKE_PROFIT'       // 接近停利 (距離 <= 3%)
  | 'TAKE_PROFIT_TRIGGERED'; // 觸及/超越停利 (🎯)

export interface HoldingRiskMetrics {
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskStatus: RiskAlertStatus;
  distanceToStopLossPercent?: number;   // 離停損價百分比 % (正數代表高於停損，負數代表已跌破)
  distanceToTakeProfitPercent?: number; // 離停利價百分比 % (正數代表低於停利，負數代表已超越)
  plannedRiskRewardRatio?: number;
  entryReason?: string;
}

export type BenchmarkType = 'NONE' | '0050' | 'SPY' | 'BALANCED_50_50';

export interface QuantPerformanceMetrics {
  hasBenchmark: boolean;          // 是否有選取並計算對照大盤基準
  alpha: number | null;           // 詹森阿爾法 Jensen's Alpha % (無基準時為 null)
  beta: number | null;            // 貝塔係數 Beta (無基準時為 null)
  sharpeRatio: number;            // 夏普值 Sharpe Ratio
  sortinoRatio?: number;          // 索提諾比 Sortino Ratio
  annualizedVolatility: number;   // 年化波動度 %
  benchmarkMaxDrawdown: number | null; // 基準最大回撤 % (無基準時為 null)
  portfolioMaxDrawdown: number;   // 投資組合最大回撤 %
  correlation: number | null;     // 與基準之相關係數 r (無基準時為 null)
}

export type DiagnosisHealthLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ATTENTION' | 'NEUTRAL';

export type QuantMetricId = 'alpha' | 'beta' | 'sharpe' | 'mdd' | 'volatility';

export interface MetricDiagnosis {
  id: QuantMetricId;
  title: string;              // 指標完整名稱 (例如：詹森阿爾法 (Alpha))
  fullName: string;           // 英文全稱 (例如：Jensen's Alpha)
  definition: string;         // 原理與金融定義
  formula: string;            // 計算公式
  benchmarkNote?: string;     // 基準與參數備註 (例如：無風險利率 Rf = 1.5%)
  
  // 即時診斷結果
  level: DiagnosisHealthLevel;// 健康度評級
  levelBadge: string;         // 顯示標籤 (例如：🟢 穩健超額)
  badgeColor: string;         // 標籤主題色
  summary: string;            // 一句話即時診斷核心結論
  suggestion: string;         // 具體量化操作建議
}

export type QuantDiagnosisMap = Record<QuantMetricId, MetricDiagnosis>;


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
  taxRateCategory?: TaxRateCategory; // 稅率類別 (現股 0.3% / 當沖 0.15% / ETF 0.1% / 免稅 0% / 自訂)
  ratio?: number; // 比例（如股票分割比例 10、減資比例 0.2828、配股率 0.05、換股比例 1.2）
  cashAmount?: number; // 退還或入帳總現金金額（如減資退款總額、現金補貼）
  exDate?: string; // 基準日 / 除權息日 (YYYY-MM-DD)
  payDate?: string; // 股利入帳發放日 (YYYY-MM-DD)
  targetSymbol?: string; // 換股目標標的代碼 (STOCK_MERGER) 或分拆新公司代碼 (SPIN_OFF)
  targetName?: string; // 目標標的名稱
  allocationRatio?: number; // 分拆成本分攤比例 (如 0.2 代表拆出 20% 成本給新標的)
  conversionPrice?: number; // 可轉債轉換價格
  isMargin?: boolean; // 是否為信用交易融資買進/賣出
  marginRate?: number; // 融資自備款比例 (預設台股現股融資為 0.4 即 40% 自備款)
  note?: string; // 交易備註
  tags?: string[]; // 標籤（如：長期核心、波段動能、股息成長）
  plan?: TradePlan; // 交易計畫 (事前)
  review?: TradeReview; // 賽後覆盤 (事後)
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
  xirrPercent?: number; // 含息資金加權年化報酬率 XIRR %
  isXirrAnnualized?: boolean; // XIRR 是否已年化 (天數 >= 30 為 true，< 30 為 false 標註非年化)
  todaysPnL?: number; // 今日損益金額 (未實現價差波動，原生幣別)
  todaysPnLPercent?: number; // 今日漲跌百分比 %
  todaysChange?: number; // 今日每股單價變動額 (currentPrice - previousClose)
  breakevenPrice?: number; // 精確損益平衡保本價 (含稅、費、折讓)
  exitPrice?: number; // 清倉/最後出場均價 (已平倉標的)
  lastTradeDate?: string; // 最後交易/平倉日期 (YYYY-MM-DD)
  isClosed?: boolean; // 是否已清倉 (shares === 0)
  accountingMethod?: import('./lot').AccountingMethod; // 所套用之沖銷會計模式
  openLotsCount?: number; // 在席未沖銷批次數量
  lots?: import('./lot').TaxLot[]; // 在席批次明細
  plan?: TradePlan; // 所套用之最新建倉交易計畫
  riskMetrics?: HoldingRiskMetrics; // 即時風控與觸價指標
  signals?: import('./signal').HoldingSignal[]; // 技術面與量價警示訊號膠囊清單
  actionDirective?: import('./signal').HoldingActionDirective; // 智慧操作建議四字定調與紀律指引
}

export type PositionFilter = 'ACTIVE' | 'CLOSED' | 'ALL';

export interface DisciplineSummary {
  totalReviewedTrades: number;       // 已覆盤總筆數
  followedPlanTradesCount: number;   // 遵守計畫筆數
  disciplineRatePercent: number;     // 全局紀律執行率 %
  averageDisciplineScore: number;    // 平均紀律評分 (1~5 星)
  topMistakes: { mistake: TradeMistakeType; count: number }[]; // 常見犯錯排行
  disciplinedAvgPnL: number;         // 遵守紀律平均損益 (TWD)
  undisciplinedAvgPnL: number;       // 違反紀律平均損益 (TWD)
}

export interface ClosedPositionsSummary {
  totalRealizedPnL: number; // 已實現總損益 (折算 TWD)
  totalDividends: number; // 累計股利 (折算 TWD)
  totalTradesCount: number; // 已平倉標的總數
  winningTradesCount: number; // 獲利標的數 (realizedPnL > 0)
  losingTradesCount: number; // 虧損標的數 (realizedPnL < 0)
  breakEvenTradesCount: number; // 平手標的數 (realizedPnL === 0)
  winRatePercent: number; // 勝率 % (winning / total * 100)
  bestWinner?: { symbol: string; name: string; pnl: number; pnlPercent: number; market: MarketType; currency: Currency };
  worstLoser?: { symbol: string; name: string; pnl: number; pnlPercent: number; market: MarketType; currency: Currency };
  disciplineSummary?: DisciplineSummary; // 賽後紀律覆盤總結指標
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
  candles?: import('./signal').DailyCandle[]; // 近 3 個月歷史日 K 線棒
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
  todayPnL?: number; // 今日損益總額
  todayPnLPercent?: number; // 今日總損益百分比 %
}

export interface PortfolioSummary {
  twd: MarketSummarySlice;
  usd: MarketSummarySlice;
  combinedTWD: MarketSummarySlice & { netAssetValue: number };
  usdToTwdRate: number;
}

export interface ApiKeysConfig {
  finmindToken?: string;
  fmpApiKey?: string;
  alphaVantageKey?: string;
  customProxyUrl?: string;
}

// 歷史日 K 與資產淨值模型型別 (Historical NAV & Time Series)
export type HistoricalDailyPriceMap = Record<string, Record<string, number>>; // symbol -> { 'YYYY-MM-DD': closePrice }
export type HistoricalFxRateMap = Record<string, number>; // 'YYYY-MM-DD' -> usdToTwdRate

export type CashFlowCategory =
  | 'DEPOSIT'              // 外部入金
  | 'WITHDRAWAL'           // 外部出金
  | 'STOCK_BUY'            // 股票買進交割扣款 (自動連動)
  | 'STOCK_SELL'           // 股票賣出交割入帳 (自動連動)
  | 'DIVIDEND_PAYOUT'      // 現金股利入帳 (自動連動/手動)
  | 'CAPITAL_RETURN'       // 減資退款入帳 (自動連動)
  | 'INTEREST_INCOME'      // 活存/閒置資金利息收入
  | 'FINANCING_FEE'        // 融資/質押借款利息支出
  | 'WIRE_FEE'             // 電匯/手續費/保管費支出
  | 'FX_TRANSFER_IN'       // 換匯/調撥轉入
  | 'FX_TRANSFER_OUT'      // 換匯/調撥轉出
  | 'LOAN_DISBURSEMENT'    // 借貸撥款入帳
  | 'LOAN_REPAYMENT'       // 借貸還本支出
  | 'OTHER';

export type CashEntryType = CashFlowCategory | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TAX';

export interface CashTransaction {
  id: string;
  accountId: string;           // 所屬券商帳戶 (BrokerAccount.id)
  currency: Currency;          // 'TWD' | 'USD'
  type: CashEntryType;         // 交易類別 (兼容 type / category)
  category?: CashFlowCategory; // 語義化別名 (同 type)
  amount: number;              // 變動金額 (正數為流入增加現金，負數為流出扣除現金)
  date: string;                // 交易/交割記錄日 (YYYY-MM-DD)
  tradeDate?: string;          // 成交日期 (T 日，如 2026-08-21)
  settlementDate?: string;     // 預計交割日 (台股 T+2 / 美股 T+1，如 2026-08-25)
  settlementStatus?: 'PENDING' | 'SETTLED'; // 交割狀態 (待交割 / 已交割)
  relatedTradeId?: string;     // 若為股票/股息自動連動，關聯之 TradeRecord.id
  relatedLoanId?: string;      // 若為借貸關聯，關聯之 LoanRecord.id
  fxRateToTwd?: number;        // 當前對台幣匯率
  fxRate?: number;             // 若為換匯調撥時的兌換匯率 (如 32.15)
  transferTargetAccountId?: string; // 若為跨帳戶調撥，目標帳戶 ID
  transferPairId?: string;     // 換匯/調撥配對流水 ID
  fee?: number;                // 附加手續費 (如電匯費 NT$600)
  note?: string;               // 備註說明
  createdAt: number;
}

export type LoanType = 'PLEDGE' | 'MARGIN' | 'CREDIT' | 'MORTGAGE' | 'OTHER';
export type LoanEntryType = 'BORROW' | 'REPAY' | 'INTEREST_PAYMENT';

export interface CollateralItem {
  symbol: string;
  shares: number;
}

export interface LoanRecord {
  id: string;
  accountId?: string;          // 關聯券商/銀行帳戶 ID
  name: string;                // 貸款項目名稱 (如：元大台積電股票質押、富邦信貸)
  loanType?: LoanType;         // 貸款類別 (PLEDGE, MARGIN, CREDIT, etc.)
  type?: LoanEntryType;        // 兼容舊格式
  principal: number;           // 當前未還本金餘額
  initialPrincipal?: number;   // 原始借款總額
  annualInterestRate?: number; // 年利率 % (如 2.35 代表 2.35%)
  interestRate?: number;       // 兼容舊格式 (如 0.025 代表 2.5%)
  currency: Currency;          // 'TWD' | 'USD'
  startDate?: string;          // 借款起始日 (YYYY-MM-DD)
  date?: string;               // 借款起始日 (兼容舊 date 欄位)
  maturityDate?: string;       // 到期日 (YYYY-MM-DD)
  lastInterestPaymentDate?: string; // 上次繳息日 (若無則自 startDate 起算)
  pledgedCollateral?: CollateralItem[]; // 質押擔保品明細
  transferFee?: number;        // 撥券費 (集保劃撥處理費，如每檔 NT$100)
  pledgeRegistryFee?: number;  // 設質登記費 (設質手續費，預設 NT$100)
  handlingFee?: number;        // 開辦手續費 / 徵信管理費 (預設 NT$0)
  pledgeFee?: number;          // 規費總計 (撥券費 + 設質費 + 手續費)
  closedDate?: string;         // 結清還款日 / 借款終止日 (YYYY-MM-DD)
  warningRatio?: number;       // 質押維持率追繳警戒線 (預設 130%)
  safeRatio?: number;          // 安全維持率警戒線 (預設 166%)
  note?: string;
  createdAt: number;
}

export interface SettledLoanSummary {
  payoffDate: string;             // 結清還款日 (YYYY-MM-DD)
  borrowDays: number;             // 實際借款天數
  paidInterest: number;           // 已付利息 (TWD/USD)
  paidPledgeRegistryFee: number;  // 已付設質登記費 (設定費)
  paidTransferFee: number;        // 已付集保撥券費 (撥券費)
  paidHandlingFee: number;        // 已付開辦手續費 (手續費)
  totalPledgeFees: number;        // 已付規費總計
  totalBorrowingCost: number;     // 總借貸支出成本 (利息 + 規費)
  hasActualLedgerRecords: boolean;// 是否有實際關聯帳本扣款流水
}

export interface PortfolioDailySnapshot {
  date: string; // YYYY-MM-DD
  totalNAV: number; // 持股市值 + 現金餘額 - 借貸負債
  stockMarketValue: number; // 股票持股市值
  cashBalance: number; // 現金帳戶總餘額
  loanBalance: number; // 借貸負債總餘額
  netCostBasis: number; // 累計外部投入本金 (入金 - 出金)
  cumulativeReturnPnL: number; // 累計總損益 (NAV - netCostBasis)
  cumulativeReturnPercent: number; // 累計總報酬率 %
  dailyPnL?: number; // 當日損益變動
  dailyReturnPercent?: number; // 當日漲跌幅 %
  events: string[]; // 當日重大交易與事件摘要
}

export type TimeRangeFilter = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export interface PortfolioPerformanceMetrics {
  currentNAV: number;
  netCostBasis: number;
  totalProfitPnL: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number; // 最大回撤 MDD %
  allTimeHighNAV: number; // 歷史最高淨值 ATH
  allTimeHighDate?: string;
  annualizedReturnPercent?: number; // 年化複合成長率 CAGR %
  xirrPercent?: number; // 資金加權年化報酬率 XIRR %
  isXirrAnnualized?: boolean; // XIRR 是否已年化
  xirrDurationDays?: number; // 總歷時天數
}

export interface StoredCorporateAction {
  id: string; // `${symbol}-${type}-${date}`
  symbol: string;
  name?: string;
  market: MarketType;
  currency: Currency;
  type: TradeType;
  date: string; // 除權息基準日 / 事件基準日 YYYY-MM-DD
  exDate?: string;
  payDate?: string; // 預估或實際發放日
  ratio?: number;
  price?: number;
  cashAmount?: number;
  description?: string;
  sourceType: 'LIVE_API' | 'CACHE' | 'OFFICIAL_DATA';
  verifiedSources?: string[];
  updatedAt?: number;
}

export interface StorageObjectStoreStat {
  name: string;
  count: number;
  description: string;
  category: 'CORE_ASSETS' | 'MARKET_CACHE' | 'SYSTEM_CONFIG';
  details?: Record<string, string | number>;
}

export interface LocalStorageInspectionStats {
  storageUsageBytes: number;
  storageQuotaBytes: number;
  usagePercentage: number;
  isStorageEstimateSupported: boolean;
  isIndexedDbHealthy: boolean;
  isLocalStorageHealthy: boolean;
  indexedDbName: string;
  indexedDbVersion: number;
  
  // 分類統計
  coreAssets: {
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
    dividendTrades: number;
    earliestTradeDate?: string;
    latestTradeDate?: string;
    totalAccounts: number;
    totalCashTransactions: number;
    totalLoanRecords: number;
  };
  
  marketCache: {
    historicalPricesSymbols: number;
    historicalPricesDataPoints: number;
    historicalFxPairs: number;
    historicalFxDataPoints: number;
    priceMetadataSymbols: number;
    corporateActionsTotal: number;
    corporateActionsSymbols: number;
    stockDictionaryTotalCount: number;
    stockDictionaryOfficialCount: number;
    stockDictionaryCustomCount: number;
    institutionalChipsDays?: number;
    institutionalChipsTotalRecords?: number;
  };
  
  systemConfig: {
    totalSnapshots: number;
    lockedSnapshots: number;
    hasFinMindKey: boolean;
    hasFmpKey: boolean;
    hasTwseConfig: boolean;
    accountingView: string;
    brokerFeeDiscount: number;
  };
  
  stores: StorageObjectStoreStat[];
}

// ==========================================
// 籌碼與聰明錢動態觀察儀 (Smart Money Flow & Bubble View)
// ==========================================

export type SmartMoneyQuadrant = 'BREAKOUT' | 'ACCUMULATION' | 'DISTRIBUTION' | 'LIQUIDATION';

export type InstitutionalSynergyType = 'DUAL_BUY' | 'TUG_OF_WAR' | 'DUAL_SELL' | 'NEUTRAL';

export interface SmartMoneyBubbleData {
  symbol: string;
  name: string;
  market: MarketType;
  x: number; // 漲跌幅動能映射 (-100 ~ +100)
  y: number; // 聰明錢流向強度映射 (-100 ~ +100)
  radius: number; // 泡泡半徑 (16px ~ 36px)
  changePercent: number; // 實質價格漲跌幅 %
  netFlowAmount: number; // 實質淨流向金額 (原幣別)
  flowScore: number; // 歸一化聰明錢流向評分 (-1.0 ~ +1.0)
  flowDescription: string; // 繁體中文白話描述 (如: "外資與投信合買 1.2 億")
  quadrant: SmartMoneyQuadrant;
  quadrantLabel: string; // 白話標籤 (🔥 主力抬轎區 / 🛡️ 逢低撿便宜區 / ⚠️ 割韭菜警戒區 / ❄️ 冷凍提款區)
  diagnosisTitle: string; // 人類診斷結論標題
  diagnosisDetail: string; // 詳細人話解釋
  foreignNetShares?: number; // 外資買賣超張數
  trustNetShares?: number; // 投信買賣超張數
  dealerNetShares?: number; // 自營商買賣超張數
  cmf?: number; // 美股 Chaikin Money Flow
  institutionalSynergy?: InstitutionalSynergyType; // 機構共振態 (土洋合買/土洋對作/土洋齊賣/中立)
  synergyLabel?: string; // 機構共振白話標籤 (🚀 土洋合買抬轎 / ⚡ 土洋對作激戰 等)
  trail: {
    x: number;
    y: number;
    date: string;
    changePercent: number;
    flowScore: number;
    foreignNetShares?: number;
    trustNetShares?: number;
    dealerNetShares?: number;
    cmf?: number;
    netFlowAmount?: number;
  }[]; // 過去 N 天時序位移點
  cx?: number; // 經防碰撞佈局計算後之畫布像素 X 坐標
  cy?: number; // 經防碰撞佈局計算後之畫布像素 Y 坐標
}

export interface SmartMoneyInputItem {
  symbol: string;
  name: string;
  market: MarketType;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  holdingValueTwd?: number;
  volume?: number;
  // 台股三大法人數據 (張數)
  foreignBuyShares?: number;
  foreignSellShares?: number;
  trustBuyShares?: number;
  trustSellShares?: number;
  dealerBuyShares?: number;
  dealerSellShares?: number;
  // 美股日 K 線歷史 (計算 CMF)
  candles?: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  historicalDailyFlows?: {
    date: string;
    changePercent: number;
    flowScore: number;
    netFlowAmount: number;
    foreignNetShares?: number;
    trustNetShares?: number;
    dealerNetShares?: number;
    cmf?: number;
  }[];
}

export interface SmartMoneyFlowAnalysisResult {
  bubbles: SmartMoneyBubbleData[];
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  breakoutCount: number;
  accumulationCount: number;
  distributionCount: number;
  liquidationCount: number;
  summaryText: string;
}


