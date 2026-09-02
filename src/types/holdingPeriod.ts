/**
 * 持股策略週期分類
 */
export type HoldingPeriodCategory =
  | 'ULTRA_SHORT'     // < 7 天 (超短線)
  | 'SHORT_TERM'      // 7 ~ 30 天 (短線波段)
  | 'MEDIUM_TERM'     // 31 ~ 180 天 (中期波段)
  | 'LONG_TERM'       // 181 ~ 364 天 (長線存股)
  | 'TAX_EXEMPT_LONG'; // >= 365 天 (長期持有 / 稅務優惠門檻)

/**
 * 週期分類顯示資訊
 */
export interface HoldingPeriodCategoryInfo {
  category: HoldingPeriodCategory;
  label: string;
  badgeColor: string;
  description: string;
}

/**
 * 持有天數與資金週轉量化結果
 */
export interface HoldingPeriodMetrics {
  symbol: string;
  weightedHoldingDays: number;         // 加權平均持股天數 (天)
  firstBuyDate: string;                // 最早買入日期 (YYYY-MM-DD)
  latestBuyDate: string;               // 最近買入日期 (YYYY-MM-DD)
  category: HoldingPeriodCategory;     // 策略週期類別
  categoryInfo: HoldingPeriodCategoryInfo; // 週期標籤與顏色
  isTaxExemptEligible: boolean;        // 是否已達 365 天長期稅務優惠門檻
  activeLotsCount: number;             // 在庫活躍買進批次數量
}
