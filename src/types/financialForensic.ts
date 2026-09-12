/**
 * 財務報表分析與穿透防雷鑑識系統核心型別契約 (Spec 0123)
 * Financial Statement Analyzer & Forensic Radar System Canonical Contracts
 */

export type MarketType = 'TW' | 'US';

/**
 * 會計師查核意見類型
 */
export type AuditOpinionType =
  | 'UNQUALIFIED'        // 無保留意見 (標準綠燈)
  | 'QUALIFIED'          // 保留意見 (黃/紅燈警戒)
  | 'DISCLAIMER'         // 無法表示意見 (致命紅燈)
  | 'ADVERSE'            // 否定意見 (致命紅燈)
  | 'UNREVIEWED';        // 未經查核 (Q1~Q3 核閱或未申報)

/**
 * 產業屬性分類（用於產業隔離閘門）
 */
export type IndustryAttribute =
  | 'STANDARD'           // 一般製造業、科技業、服務業
  | 'FINANCIALS'         // 金融保險控股（豁免負債比與存貨週轉）
  | 'CYCLICAL';          // 強週期景氣循環類股（航運、鋼鐵、記憶體等，高峰警語）

/**
 * 核心 16 欄位季度財務數據契約 (Quarterly Financial Record)
 */
export interface QuarterlyFinancialRecord {
  symbol: string;               // 標的代碼 (e.g., '2330', 'AAPL')
  market: MarketType;           // 市場類別 ('TW' | 'US')
  year: number;                 // 年度 (西元, e.g., 2025)
  quarter: number;              // 季度 (1 | 2 | 3 | 4)
  periodDate: string;           // 結算日 (e.g., '2025-06-30')
  
  // 損益表 (Income Statement)
  income: {
    revenue: number;            // 營業收入
    grossProfit: number;        // 營業毛利
    operatingIncome: number;    // 營業利益
    netIncome: number;          // 稅後淨利
    eps: number;                // 每股盈餘
  };

  // 資產負債表 (Balance Sheet)
  balanceSheet: {
    totalAssets: number;        // 總資產
    totalLiabilities: number;   // 總負債
    totalEquity: number;        // 股東權益
    accountsReceivable: number; // 應收帳款與票據
    inventory: number;          // 存貨
    cashAndEquivalents: number; // 現金與約當現金
    shortTermDebt?: number;     // 短期借款 (選填)
    longTermDebt?: number;      // 長期有息負債 (選填)
  };

  // 現金流量表 (Cash Flow Statement)
  cashFlow: {
    operatingCashFlow: number;  // 營業活動現金流量 (CFO)
    capitalExpenditure: number; // 資本支出 (Capex)
    stockBasedCompensation?: number; // 美股股權激勵 (SBC, 選填)
    dividendPaid?: number;      // 支付之現金股利 (選填)
  };

  // 審計查核資訊 (Auditor & KAM)
  auditInfo?: {
    opinionType: AuditOpinionType;
    cpaFirm?: string;
    isBigFour?: boolean;
    keyAuditMatters?: string[];
  };

  updatedAt: number;            // 本地快取更新時間戳
}

/**
 * 六大「市場沒說什麼」逆向背離型別
 */
export type ForensicAnomalyType =
  | 'CHANNEL_STUFFING_DIVERGENCE' // 塞貨與庫存積壓 (營收增但 DSO/DIO 暴增)
  | 'EARNINGS_QUALITY_DECOUPLING'  // 紙上富貴 (淨利增但 CFO 為負或脫鉤)
  | 'DEBT_FUNDED_DIVIDEND'        // 借債配息 (FCF 負卻發高息)
  | 'CORE_BUSINESS_DECAY'         // 業外美化 (本業衰退靠處分資產)
  | 'SBC_DILUTION_WARNING'        // SBC 股權稀釋 (美股 SBC/Rev > 15%)
  | 'AUDITOR_OPINION_RISK';       // 審計查核異常 (保留意見或頻繁換所)

export type AnomalySeverity = 'HEALTHY' | 'NEUTRAL' | 'WARNING' | 'DANGEROUS';

export interface ForensicAnomaly {
  type: ForensicAnomalyType;
  severity: AnomalySeverity;
  title: string;
  summary: string;
  metrics?: Record<string, number>;
}

/**
 * 杜邦三因子分析 (DuPont Analysis)
 */
export interface DuPontAnalysis {
  roe: number;                  // 股東權益報酬率 (%)
  netMargin: number;            // 淨利率 (%)
  assetTurnover: number;        // 資產週轉率 (次)
  equityMultiplier: number;     // 權益乘數 (倍)
  primaryDriver: 'PROFITABILITY' | 'EFFICIENCY' | 'LEVERAGE';
}

/**
 * 獲利能力維度指標
 */
export interface ProfitabilityMetrics {
  grossMargin: number;          // 毛利率 (%)
  operatingMargin: number;      // 營業利益率 (%)
  netMargin: number;            // 稅後淨利率 (%)
  roe: number;                  // ROE (%)
  eps: number;                  // 每股盈餘
  marginTrend: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
}

/**
 * 安全性與償債結構指標
 */
export interface SafetyMetrics {
  debtRatio: number;            // 負債比率 (%)
  quickRatio: number;           // 速動比率 (%)
  netCash: number;              // 真實淨現金水位 (元)
  isNetCashPositive: boolean;   // 淨現金是否為正
  interestCoverage?: number;    // 利息保障倍數 (選填)
}

/**
 * 營運效率指標
 */
export interface TurnoverMetrics {
  dsoDays: number;              // 應收帳款週轉天數 (天)
  dioDays: number;              // 存貨週轉天數 (天)
  dpoDays?: number;             // 應付帳款週轉天數 (選填)
  cccDays?: number;             // 現金轉換週期 (天)
}

/**
 * 現金流健康度指標
 */
export interface CashFlowMetrics {
  operatingCashFlow: number;    // CFO (元)
  freeCashFlow: number;         // FCF (元)
  realFcfPerShare?: number;     // 扣除 SBC 後真實每股 FCF
  cfoToNetIncomeRatio: number;  // CFO / Net Income 比率
  dividendPurity: 'ORGANIC_CASH_FLOW' | 'CAPITAL_RESERVE' | 'DEBT_FINANCED' | 'NO_DIVIDEND';
}

/**
 * 四大體質指示燈顏色
 */
export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

export interface TrafficLightsState {
  profitability: TrafficLightColor;
  safety: TrafficLightColor;
  efficiency: TrafficLightColor;
  cashFlow: TrafficLightColor;
}

/**
 * 綜合健康評估等級
 */
export type FinancialHealthGrade = 'EXCELLENT' | 'HEALTHY' | 'WARNING' | 'DANGEROUS';

/**
 * 穿透式財報戰情報告實體 (Financial Forensic Report)
 */
export interface FinancialForensicReport {
  symbol: string;
  market: MarketType;
  companyName: string;
  industryAttribute: IndustryAttribute;
  latestPeriod: string;         // e.g. '2025-Q2'
  overallScore: number;         // 0 ~ 100
  overallGrade: FinancialHealthGrade;
  trafficLights: TrafficLightsState;
  executiveSummary: string;     // 0 秒核心操盤結論一句話
  anomalies: ForensicAnomaly[]; // 六大逆向排查清單
  duPont: DuPontAnalysis;
  historicalRecords: QuarterlyFinancialRecord[];
  updatedAt: number;
}

/**
 * 四大會計師事務所關鍵字清單（台灣與全球）
 */
export const BIG_FOUR_FIRMS = [
  '勤業眾信', 'DELOITTE',
  '安侯建業', 'KPMG',
  '資誠', 'PWC', 'PRICEWATERHOUSECOOPERS',
  '安永', 'EY', 'ERNST & YOUNG',
];

/**
 * 輔助函式：判斷是否為四大會計師事務所
 */
export function isBigFourFirm(firmName?: string): boolean {
  if (!firmName) return false;
  const upper = firmName.toUpperCase();
  return BIG_FOUR_FIRMS.some((k) => upper.includes(k));
}
