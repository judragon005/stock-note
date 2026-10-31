/**
 * 宏觀戰情室與 AI 智慧作戰方針型別定義 (Macro War Room & AI Advisor Types)
 */

export type VixLevel = 'EUPHORIA' | 'NORMAL' | 'ELEVATED' | 'PANIC';

export type FearAndGreedLevel =
  | 'EXTREME_FEAR'
  | 'FEAR'
  | 'NEUTRAL'
  | 'GREED'
  | 'EXTREME_GREED';

/**
 * 台股大盤騰落廣度摘要 (Lakehouse Market Breadth Summary)
 */
export interface TwMarketBreadthSummary {
  advancingCount: number;       // 上漲家數
  decliningCount: number;       // 下跌家數
  unchangedCount: number;       // 平盤家數
  pctAbove20MA: number;         // 站上 20MA (月線) 股票比例 % (0~100)
  pctAbove20Ma?: number;        // 相容小寫命名
  above20MaPercent?: number;    // 相容別名
  breadthRegime: 'BROAD_RALLY' | 'NARROW_TSMC_TRAP' | 'BROAD_DECLINE' | 'NEUTRAL';
  asOfDate?: string;
}

/**
 * 三大法人上市櫃現貨合計買賣超摘要 (Institutional Spot Flow Summary)
 */
export interface TwInstitutionalSpotSummary {
  foreignNetTwdBillions: number; // 外資現貨買賣超 (億 TWD)
  trustNetTwdBillions: number;   // 投信現貨買賣超 (億 TWD)
  dealerNetTwdBillions: number;  // 自營商現貨買賣超 (億 TWD)
  totalNetTwdBillions: number;   // 三大法人合計買賣超 (億 TWD)
  asOfDate?: string;
}

/**
 * 全球宏觀指標即時/歷史快照 (Spec 0209 擴充版)
 */
export interface MacroIndicatorSnapshot {
  date: string;               // YYYY-MM-DD
  us10y: number;              // 10Y 美債殖利率 % (如 3.85)
  us2y: number;               // 2Y 美債殖利率 % (如 4.00)
  us3m?: number;              // 3M 美債殖利率 % (動態無風險利率基準)
  yieldSpread: number;        // 10Y - 2Y 殖利率利差 (負值為倒掛)
  isYieldInverted: boolean;   // 是否倒掛 (yieldSpread < 0)
  vix: number;                // CBOE 恐慌指數
  vixLevel: VixLevel;         // 恐慌分級
  fearAndGreedIndex: number;  // 恐慌貪婪指數 (0~100)
  fearAndGreedLevel: FearAndGreedLevel;
  goldPrice: number;          // 國際黃金現貨/期貨價格 GC=F (USD/oz, 3000~4000+)
  oilPrice: number;           // WTI 原油期貨價格 CL=F (USD/bbl)
  dxy: number;                // 美元指數 DX-Y.NYB (如 101.2)
  usdToTwd: number;           // 美元兌台幣匯率 TWD=X
  usM2GrowthYoY?: number;     // 美國 M2 貨幣年增率 %
  twM2GrowthYoY?: number;     // 台灣 M2 貨幣年增率 %
  usFedRate?: number;         // 聯準會有效基準利率 % (FRED FEDFUNDS)
  usCpiYoY?: number;          // 美國 CPI 通膨年增率 % (FRED CPIAUCSL)
  // --- 0193 法人金絲雀與籌碼擴充 ---
  creditSpreadOAS?: number;   // 美國高收益債期權調整利差 % (如 3.5%)
  cdsInsuranceIndex?: number; // CDS/CDX 債券履約違約互換保險指數 (點數，如 65)
  cdsRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  twFuturesNetOi?: number;    // 外資台指期淨未平倉口數 (負數為淨空單，如 -35000)
  twMarginMaintenance?: number; // 全市場融資維持率 % (如 165.2，130% 為斷頭線)
  twFuturesRiskLevel?: 'BULLISH' | 'NEUTRAL' | 'HIGH_ALERT' | 'EXTREME_SHORT';
  twMarginRiskLevel?: 'SAFE' | 'WARNING' | 'LIQUIDATION_RISK';
  // --- 0209 跨市場費半/ADR 傳導鏈與波段位階擴充 ---
  soxIndex?: number;            // 費城半導體指數 (^SOX)
  soxChangePercent?: number;    // 費半單日漲跌幅 %
  soxBias20Ma?: number;         // 費半對 20MA 乖離率 %
  soxAbove20Ma?: boolean;       // 費半是否站上 20MA (月線)
  soxAbove60Ma?: boolean;       // 費半是否站上 60MA (季線)
  tsmAdrPrice?: number;         // 台積電美股 ADR 收盤價 (TSM, USD)
  tsmAdrChangePercent?: number; // 台積電 ADR 單日漲跌幅 %
  tsmTwPrice?: number;          // 台積電台股收盤價 (2330.TW, TWD)
  tsmAdrConvertedTwd?: number;  // 台積電 ADR 5:1 折合台股價 (TWD)
  tsmAdrPremiumPercent?: number;// 台積電 ADR 溢折價率 %
  taiexIndex?: number;          // 台股加權指數 (^TWII)
  taiexChangePercent?: number;  // 台股加權指數漲跌幅 %
  taiexBias20Ma?: number;       // 台股對 20MA 乖離率 %
  taiexAbove20Ma?: boolean;     // 台股是否站上 20MA
  taiexAbove60Ma?: boolean;     // 台股是否站上 60MA
  sp500Index?: number;          // 標普 500 指數 (^GSPC)
  sp500ChangePercent?: number;  // 標普 500 漲跌幅 %
  sp500Bias20Ma?: number;       // 標普 500 對 20MA 乖離率 %
  nasdaqIndex?: number;         // 那斯達克指數 (^IXIC)
  nasdaqChangePercent?: number; // 那斯達克漲跌幅 %
  nasdaqBias20Ma?: number;      // 那斯達克對 20MA 乖離率 %
  twMarketBreadth?: TwMarketBreadthSummary;
  twInstitutionalSpot?: TwInstitutionalSpotSummary;
  asOfTimestamp?: string;       // ISO 或本地可讀資料基準時間戳
  sourceStatus?: 'LIVE' | 'CACHED' | 'CALIBRATED';
  updatedAt: number;
}

/**
 * 宏觀水溫計與作戰姿態 (Macro Thermometer)
 */
export interface MacroThermometer {
  score: number;                              // 0 ~ 100 綜合水溫分
  stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE'; // 【防禦・現金為王】/【平衡・區間操作】/【進攻・積極擴張】
  suggestedEquityAllocationPercent: number;  // 建議股票總倉位上限 % (例如 30%、50%、80%)
  rationale: string[];                       // 綜合評分推論要點清單
}

/**
 * 0209 總經配置 × 波段戰術雙溫度計結果 (Dual Macro-Swing Thermometer)
 */
export interface MacroDualThermometerResult {
  strategicRegime: {
    score: number;                              // 0 ~ 100 長線總經健康分
    stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE';
    label: string;                              // 如「長線平衡配置」
    recommendedEquityCapPercent: number;        // 建議總股票倉位上限 % (30~85%)
    drivers: string[];                          // 長線驅動因子摘要
  };
  tacticalSwing: {
    score: number;                              // 0 ~ 100 短中期波段動能分
    signal: 'AGGRESSIVE_SWING' | 'PULLBACK_BUY' | 'OVERHEATED_TRIM' | 'DEFENSIVE_CASH';
    label: string;                              // 如「⚡ 短線拉回買點 / 費半強勢領漲」
    twSwingSummary: string;                     // 台股波段位階與廣度診斷
    usSwingSummary: string;                     // 美股與費半波段位階診斷
    isNarrowTsmcTrap: boolean;                  // 是否偵測到拉積盤警訊
    drivers: string[];                          // 波段驅動因子摘要
  };
}

export type MarketViewTab = 'GLOBAL' | 'TW' | 'US';

/**
 * 個人投資組合宏觀防護盾 (Portfolio Macro Shield)
 */
export interface MacroPortfolioShield {
  totalNavTWD: number;               // 帳戶總淨值 (NAV)
  cashBalanceTWD: number;            // 實質可用現金 (TWD)
  cashRatioPercent: number;          // 現金佔比 % (Cash / NAV * 100)
  cashStatus: 'TIGHT' | 'ADEQUATE' | 'STRONG'; // 緊繃 (<10%) / 適中 (10~30%) / 充裕 (>30%)
  hasLoans: boolean;                 // 是否有質押借款
  marginMaintenanceRatio: number | null; // 質押維持率 % (無借款時為 null，嚴禁寫死 250%)
  marginStatus: 'SAFE' | 'WARNING' | 'MARGIN_CALL' | 'NO_LOAN'; // 安全 (>=166%) / 警戒 (130~166%) / 追繳 (<130%) / 無借款
  maxAllocationDriftPercent: number; // 目標資產配置最大偏離度 %
  portfolioBeta?: number;            // 投資組合對大盤 Beta
  // --- 0193 法人風控擴充 ---
  valueAtRisk95TWD?: number;         // 單日 95% 信心水準在險價值 (TWD)
  varRatioPercent?: number;          // VaR 佔總淨值百分比 %
  fxDeltaTWD?: number;               // 台幣每升值 1 元之美股淨值變動額 (TWD)
  quickStressTest?: QuickStressScenario[]; // 3 階急速黑天鵝壓力測試
  // --- 0209 真・自由子彈、穿透半導體曝險與匯差緩衝擴充 ---
  freeDeployableCashTWD?: number;    // 扣除 T+2 在途交割與近 7 日 DCA 預留後之真・自由可動用子彈
  pendingSettlementOutflowTWD?: number; // T+1/T+2 待付交割淨流出 (TWD)
  upcoming7dDcaCommitmentTWD?: number;  // 近 7 日定期定額預留扣款 (TWD)
  tsmcLookThroughWeightPercent?: number; // 穿透 ETF 後之真實台積電 (2330+TSM) 總權重 %
  semiLookThroughWeightPercent?: number; // 穿透 ETF 後之真實廣義半導體/AI 硬體總權重 %
  soxStressImpact3PctTWD?: number;       // 若費半 (^SOX) 波動 ±3% 對穿透後半導體部位之預估損益衝擊 (TWD)
  maxDropToleranceTo130Percent?: number; // 距離 130% 追繳線之大盤安全耐受跌幅 %
  usWeightedCostFxRate?: number;         // 美股持倉加權買進成本匯率
  usFxCushionTWD?: number;               // 美股持倉累積外匯匯差緩衝墊 (TWD)
}

/**
 * 急速黑天鵝壓力測試情境
 */
export interface QuickStressScenario {
  dropPercent: number;               // 跌幅 % (-10, -20, -30)
  label: string;                     // 標籤 (如 "-10% 震盪")
  stressedCollateralTWD: number;     // 壓力後擔保品總市值 (TWD)
  stressedMarginRatioPercent: number;// 壓力後質押維持率 %
  marginCallShortfallTWD: number;    // 追繳保證金缺口 (TWD，達 130% 斷頭線需補足之金額)
  status: 'SAFE' | 'WARNING' | 'MARGIN_CALL';
}

export type CatalystCategory =
  | 'CENTRAL_BANK'
  | 'INFLATION'
  | 'EMPLOYMENT'
  | 'EARNINGS'
  | 'EARNINGS_DIVIDEND'
  | 'DERIVATIVE_SETTLEMENT'
  | 'CUSTOM';

export type CatalystImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export type TimelineHorizon = 'TODAY' | 'WEEK' | 'MONTH';

export interface GroupedCatalysts {
  today: UpcomingCatalyst[];
  within7Days: UpcomingCatalyst[];
  within30Days: UpcomingCatalyst[];
}

/**
 * 關鍵宏觀財經事件
 */
export interface UpcomingCatalyst {
  id: string;
  name: string;
  date: string;                      // YYYY-MM-DD
  daysLeft: number;                  // 倒數天數 (0 為今日, 負數表示已過期)
  category: CatalystCategory;
  impact?: CatalystImpact;           // 衝擊度等級 (券商/法人維度)
  targetMarket?: 'ALL' | 'TW' | 'US';// 影響市場
  symbol?: string;                   // 關聯個股代號 (如 2330.TW, NVDA)
  description: string;
  isCustom?: boolean;                // 是否為使用者手動新增
  sourceUrl?: string;                // 官方來源連結
}

/**
 * 0209 外部 AI 宏觀戰略釘選結構 (Macro Strategy Pin Loopback)
 */
export interface MacroPinnedStrategy {
  id: string;
  aiModel: string;                       // 例如 Claude 3.5 Sonnet / ChatGPT-4o / Gemini 1.5 Pro
  recommendedEquityCapPercent: number;   // 建議股票總倉位上限 %
  soxSupportLevel?: number;              // 費半 (^SOX) 關鍵防守支撐點位
  taiexSupportLevel?: number;            // 台股 (^TWII) 關鍵防守支撐點位
  tacticalSummary: string;               // 一句話波段操作戰術摘要
  pinnedAt: string;                      // ISO 時間戳
  expiresAt: string;                     // 預設 7 天後到期提醒重診
}

/**
 * AI 智慧每日作戰方針
 */
export interface AiMorningBriefDirective {
  headline: string;                  // 四字定調 (例如 "【防禦蓄勢・分批低接】")
  tone: 'DEFENSIVE' | 'OPPORTUNISTIC' | 'NEUTRAL' | 'CAUTION';
  summary: string;                   // 一句話核心精煉總結
  actionPoints: string[];            // 今日具體執行要點清單
  macroDiagnosis: string;            // 宏觀環境診斷
  shieldDiagnosis: string;           // 個人防護盾體質診斷
  llmPayloadJson: string;            // 供外部 LLM (Gemini/Claude) 呼叫之結構化 JSON 字串
}

/**
 * 持股動能訊號摘要 (用於 AI 晨報動態點名與戰術表)
 */
export interface MacroHoldingSignalInput {
  symbol: string;
  name?: string;
  market?: 'TW' | 'US';
  action: 'BUY' | 'AVOID' | 'SELL' | 'HOLD';
  stopLossPrice?: number;
  targetPrice?: number;
  // --- 0204 實戰風控擴充 ---
  shares?: number;               // 持有股數 (如 2000 股 = 2 張)
  costBasis?: number;            // 平均買進成本
  currentPrice?: number;         // 最新市價
  marketValueTWD?: number;       // 部位總市值 (TWD)
  weightPercent?: number;        // 佔帳戶總資產權重百分比 % (例如 8.5%)
  unrealizedPnlPercent?: number; // 未實現損益百分比 % (例如 -4.2%)
  boxTop?: number;               // 三日箱頂價格
  boxBottom?: number;            // 三日箱底價格
  // --- 0209 自訂停損停利觸價與處置股警示擴充 ---
  planRiskStatus?: 'NORMAL' | 'NEAR_STOP_LOSS' | 'STOP_LOSS_TRIGGERED' | 'NEAR_TAKE_PROFIT' | 'TAKE_PROFIT_TRIGGERED';
  dispositionStatus?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION';
  signalSummary?: string;
}

/**
 * 待收股息進度 (用於 AI 晨報被動現金流規劃)
 */
export interface UpcomingDividendInput {
  symbol: string;
  amount: number;
  payDate: string;
  daysLeft: number;
}

/**
 * 引擎輸入參數
 */
export interface MacroAdvisorInput {
  macro: MacroIndicatorSnapshot;
  shield: MacroPortfolioShield;
  asOfDate?: string;                 // 基準日 (YYYY-MM-DD, 預設為今日)
  catalysts?: UpcomingCatalyst[];
  holdingSignals?: MacroHoldingSignalInput[];
  upcomingDividends?: UpcomingDividendInput[];
}
