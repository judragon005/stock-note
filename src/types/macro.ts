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
 * 全球宏觀指標即時/歷史快照
 */
export interface MacroIndicatorSnapshot {
  date: string;               // YYYY-MM-DD
  us10y: number;              // 10Y 美債殖利率 % (如 3.85)
  us2y: number;               // 2Y 美債殖利率 % (如 4.00)
  yieldSpread: number;        // 10Y - 2Y 殖利率利差 (負值為倒掛)
  isYieldInverted: boolean;   // 是否倒掛 (yieldSpread < 0)
  vix: number;                // CBOE 恐慌指數
  vixLevel: VixLevel;         // 恐慌分級
  fearAndGreedIndex: number;  // 恐慌貪婪指數 (0~100)
  fearAndGreedLevel: FearAndGreedLevel;
  goldPrice: number;          // 黃金期貨價格 (USD/oz)
  oilPrice: number;           // 原油期貨價格 (USD/bbl)
  dxy: number;                // 美元指數 (如 101.2)
  usdToTwd: number;           // 美元兌台幣匯率
  usM2GrowthYoY?: number;     // 美國 M2 貨幣年增率 %
  twM2GrowthYoY?: number;     // 台灣 M2 貨幣年增率 %
  // --- 0193 法人金絲雀與籌碼擴充 ---
  creditSpreadOAS?: number;   // 美國高收益債期權調整利差 % (如 3.5%)
  cdsInsuranceIndex?: number; // CDS/CDX 債券履約違約互換保險指數 (點數，如 65)
  cdsRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  twFuturesNetOi?: number;    // 外資台指期淨未平倉口數 (負數為淨空單，如 -35000)
  twMarginMaintenance?: number; // 全市場融資維持率 % (如 165.2，130% 為斷頭線)
  twFuturesRiskLevel?: 'BULLISH' | 'NEUTRAL' | 'HIGH_ALERT' | 'EXTREME_SHORT';
  twMarginRiskLevel?: 'SAFE' | 'WARNING' | 'LIQUIDATION_RISK';
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
  marginMaintenanceRatio: number;    // 質押維持率 %
  marginStatus: 'SAFE' | 'WARNING' | 'MARGIN_CALL' | 'NO_LOAN'; // 安全 (>=166%) / 警戒 (130~166%) / 追繳 (<130%) / 無借款
  maxAllocationDriftPercent: number; // 目標資產配置最大偏離度 %
  portfolioBeta?: number;            // 投資組合對大盤 Beta
  // --- 0193 法人風控擴充 ---
  valueAtRisk95TWD?: number;         // 單日 95% 信心水準在險價值 (TWD)
  varRatioPercent?: number;          // VaR 佔總淨值百分比 %
  fxDeltaTWD?: number;               // 台幣每升值 1 元之美股淨值變動額 (TWD)
  quickStressTest?: QuickStressScenario[]; // 3 階急速黑天鵝壓力測試
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
  symbol?: string;                   // 關聯個股代號 (如 2330.TW)
  description: string;
  isCustom?: boolean;                // 是否為使用者手動新增
  sourceUrl?: string;                // 官方來源連結
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
 * 持股動能訊號摘要 (用於 AI 晨報動態點名)
 */
export interface MacroHoldingSignalInput {
  symbol: string;
  name?: string;
  action: 'BUY' | 'AVOID' | 'SELL' | 'HOLD';
  stopLossPrice?: number;
  targetPrice?: number;
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
