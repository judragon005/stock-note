import { MarketType, Currency } from './stock';

/**
 * 應收股利明細 (除息日至發放日之間)
 */
export interface ReceivableDividend {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  exDate: string;                 // 除息日 / 除權日 (YYYY-MM-DD)
  payDate: string;                // 預計現金發放日 (YYYY-MM-DD)
  sharesHeldOnExDate: number;     // 除息基準日持有股數
  cashDividendPerShare: number;   // 每股現金股利
  estimatedGrossDividend: number; // 預估應發總額 (原生幣別)
  stockDividendShares?: number;   // 預估獲配股票股利股數
  stockPayDate?: string;          // 預估配股上市入庫日 (YYYY-MM-DD)
  stockDividendParValue?: number; // 股票股利法定面額價值 (TWD)
  isStockDelivered?: boolean;     // 股票是否已到期入庫
  estimatedTaxOrFee: number;      // 預估預扣稅 (美股 30%) 或二代健保 (台股 2.11%)
  estimatedNhiTax?: number;       // 預估二代健保補充保費 (台股 2.11%)
  estimatedWireFee?: number;      // 預估跨行匯費 (台股 10 元)
  estimatedNetDividend: number;   // 預估實領股息 (原生幣別)
  estimatedNetDividendInTWD: number; // 折合台幣實領金額
  status: 'PENDING_PAYMENT' | 'RECEIVED' | 'OVERDUE' | 'UPCOMING_EX';
}

/**
 * 持倉平滑未實現損益結果
 */
export interface SmoothedHoldingPnL {
  symbol: string;
  rawUnrealizedPnL: number;       // 原生未實現損益 (TWD)
  rawUnrealizedPnLPercent: number;// 原生未實現報酬率 %
  receivableDividendTWD: number;  // 待發放應收現金股息 (TWD)
  receivableStockShares?: number; // 待入帳配股股數
  receivableStockValueTWD?: number; // 待入帳配股市值 (TWD)
  smoothedUnrealizedPnL: number;  // 平滑後未實現損益 (rawUnrealizedPnL + receivableDividendTWD + receivableStockValueTWD)
  smoothedUnrealizedPnLPercent: number; // 平滑後報酬率 %
  hasReceivable: boolean;
}

/**
 * 美股外匯損益與本體價差拆解結果
 */
export interface FxBreakdownResult {
  symbol: string;
  currency: Currency;
  totalCostUSD: number;           // 原始美元投入成本
  currentMarketValueUSD: number;  // 最新美元市值
  costFxRate: number;             // 買進加權平均匯率
  currentFxRate: number;          // 最新即時匯率
  
  // 雙軸損益拆解 (折合 TWD)
  assetGainTWD: number;           // 股票本體價差損益 = (現價USD - 均價USD) * 股數 * 現時匯率
  assetGainPercent: number;       // 股票本體報酬率 %
  fxGainTWD: number;              // 外匯匯差損益 = 原始美元成本 * (現時匯率 - 買進匯率)
  fxGainPercent: number;          // 外匯匯率波動率 %
  totalGainTWD: number;           // 總未實現損益 (折合 TWD) = assetGainTWD + fxGainTWD
  totalGainPercent: number;       // 總報酬率 %
}

/**
 * 台股單筆二代健保警示項目
 */
export interface TwNhiAlertItem {
  symbol: string;
  name: string;
  exDate: string;
  payDate: string;
  grossDividendTWD: number;
  triggersNhi: boolean;           // 是否達 20,000 元門檻
  nhiFeeTWD: number;              // 2.11% 補充保費
  thresholdAmount: number;        // 20,000 元
  description: string;
}

/**
 * 美股海外所得與最低稅負制進度
 */
export interface OverseasTaxProgress {
  taxYear: number;
  realizedCapitalGainsTWD: number; // 當年度已實現價差損益 (美股)
  overseasDividendsTWD: number;    // 當年度已領美股股息
  totalOverseasIncomeTWD: number;  // 海外所得合計
  filingThresholdTWD: number;      // 申報門檻 (1,000,000 TWD)
  amtExemptionTWD: number;         // 免稅額 (7,500,000 TWD)
  isFilingRequired: boolean;       // 是否需申報
  isAmtExceeded: boolean;          // 是否逾免稅額
  filingProgressPercent: number;   // 申報門檻進度 % (0~100)
  amtProgressPercent: number;      // 免稅額進度 % (0~100)
}

/**
 * 稅階合規整體狀態
 */
export interface TaxComplianceStatus {
  twNhiAlerts: TwNhiAlertItem[];
  usOverseasIncome: OverseasTaxProgress;
}

/**
 * 股利日誌彙整報告
 */
export interface DividendSummaryReport {
  totalHistoricalDividendsTWD: number; // 全歷史累計領取股息 (TWD)
  currentYearDividendsTWD: number;     // 當年度累計領取股息 (TWD)
  previousYearDividendsTWD: number;    // 去年同期累計 (TWD)
  yoyGrowthPercent: number;            // 年度成長率 %
  trailing12mDividendsTWD: number;     // 近 12 個月現金流合計
  monthlyDistribution: {
    monthKey: string;                  // YYYY-MM
    monthLabel: string;                // "2026/08" 或 "8月"
    grossTWD: number;
    netTWD: number;
    taxTWD: number;
    count: number;
  }[];
  topDividendContributors: {
    symbol: string;
    name: string;
    market: MarketType;
    totalDividendsTWD: number;
    percentageOfTotal: number;
  }[];
  currentYearTopContributors: {
    symbol: string;
    name: string;
    market: MarketType;
    totalDividendsTWD: number;
    percentageOfTotal: number;
  }[];
  upcomingDividends: ReceivableDividend[]; // 即將除息與待發放清單
}
