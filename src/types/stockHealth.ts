import type { MarketType } from './stock';
import type { IndustryAttribute, QuarterlyFinancialRecord } from './financialForensic';

/**
 * 股票健診 7 大維度枚舉（本期實作 4 大核心，保留 3 大擴充插槽）
 */
export type HealthCheckCategory =
  | 'SAFE_GUARD'       // 排除地雷股健診 (6 項)
  | 'DIVIDEND_VALUE'   // 定存股健診 (5 項)
  | 'GROWTH_MOMENTUM'  // 成長股健診 (4 項)
  | 'CHEAP_VALUATION'  // 便宜股健診 (6 項)
  // 擴充插槽 (Phase 2)
  | 'SOLVENCY'         // 安全性健診
  | 'PROFITABILITY'    // 獲利能力健診
  | 'FREE_CASH_FLOW';  // 現金流健診

/**
 * 單一健診細項指標檢驗結果
 */
export interface HealthCheckItemResult {
  id: string;
  name: string;                    // 檢查項目名稱 (e.g. '自由現金流入近五年有三年大於 0')
  passed: boolean;                 // 是否通過
  actualValue?: number | string;   // 實際數值或比率
  thresholdDesc: string;           // 門檻敘述
  detailExplanation?: string;      // 評估說明 (如：5年中有4年為正)
  exempted?: boolean;              // 是否受產業豁免 (如金融股豁免存貨週轉)
}

/**
 * 單一健診模組彙總結果
 */
export interface HealthCheckCategoryResult {
  category: HealthCheckCategory;
  title: string;                   // 模組標題 (如 '排除地雷股健診')
  description: string;             // 模組定位描述
  summaryText: string;             // 綜合評語 (動態組裝)
  totalItems: number;              // 總檢查項目數 (扣除豁免項目)
  passedItems: number;             // 通過項目數
  passRatio: number;               // 通過率 (0 ~ 100%)
  items: HealthCheckItemResult[];  // 細部指標檢驗清單
}

/**
 * 個股全量健康診斷報告契約
 */
export interface StockHealthDiagnosis {
  symbol: string;
  name?: string;
  market: MarketType;
  currentPrice: number;
  changeRate: number;
  dataSufficientYears: number;     // 實際可用年限 (至多 5 年)
  isDataSufficient: boolean;       // 是否具備至少 4 季數據
  categories: HealthCheckCategoryResult[];
  overallSummary: string;
  updatedAt: number;
}

/**
 * 健診診斷引擎輸入參數
 */
export interface StockHealthInput {
  symbol: string;
  name?: string;
  market?: MarketType;
  industryAttribute?: IndustryAttribute;
  records: QuarterlyFinancialRecord[];
  currentPrice: number;
  changeRate?: number;
  annualDividends?: { year: number; amount: number }[]; // 歷史年度股利記錄 (若無則由 records 推估)
}
