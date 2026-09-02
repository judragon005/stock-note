import { HoldingPosition, LoanRecord } from './stock';

/**
 * 質押維持率健康水位等級
 */
export type MarginMaintenanceStatus =
  | 'SAFE'         // > 200% (極度安全綠燈)
  | 'HEALTHY'      // 160% ~ 200% (健康藍燈)
  | 'WARNING'      // 130% ~ 160% (注意黃燈)
  | 'MARGIN_CALL'; // < 130% (追繳斷頭紅燈)

/**
 * 維持率等級詳情
 */
export interface MarginMaintenanceInfo {
  status: MarginMaintenanceStatus;
  label: string;
  badgeColor: string;
  textColor: string;
  description: string;
}

/**
 * 質押單一標的現況與壓力模擬
 */
export interface PledgedHoldingStressItem {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  baselineValueTWD: number;
  dropPercent: number;           // 跌幅 (0 ~ 1, 例如 0.2 代表下跌 20%)
  stressedPrice: number;
  stressedValueTWD: number;
}

/**
 * 質押壓力測試整體結果
 */
export interface MarginStressResult {
  hasLoans: boolean;                     // 是否存在質押借款
  totalLoanDebtTWD: number;              // 總質押借款負債 (本金 + 應計利息)
  currentCollateralValueTWD: number;     // 當前擔保品總市值 (TWD)
  currentMaintenanceRatio: number;       // 當前靜態維持率 (如 215.4%)
  currentStatusInfo: MarginMaintenanceInfo; // 當前維持率狀態
  
  // 壓力模擬情境數據
  scenarioDropPercent: number;           // 當前模擬跌幅 (0 ~ 1)
  stressedCollateralValueTWD: number;    // 壓力下跌後擔保品總市值
  stressedMaintenanceRatio: number;      // 壓力下跌後維持率
  stressedStatusInfo: MarginMaintenanceInfo; // 壓力後維持率狀態
  
  // 斷頭安全邊際與耐受度
  maxDropTolerancePercent: number;       // 最大耐受跌幅 (距離 130% 追繳線之百分比，如 38.5%)
  pointsToMarginCall: number;            // 距離 130% 之維持率點數差
  
  // 追繳差額逆運算
  requiredCashFor130TWD: number;         // 恢復至法定 130% 追繳線所需補繳現金
  requiredCashFor160TWD: number;         // 恢復至安全 160% 水位所需補繳現金
  requiredStockValueFor130TWD: number;   // 需加補之等值擔保品股票市值 (130%)
  requiredStockValueFor160TWD: number;   // 需加補之等值擔保品股票市值 (160%)
  
  // 個股壓力明細
  pledgedHoldings: PledgedHoldingStressItem[];
}

/**
 * 壓力測試輸入參數
 */
export interface CalculateMarginStressParams {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  usdToTwdRate: number;
  generalMarketDropPercent?: number;     // 通用大盤下跌百分比 (0 ~ 0.5，例如 0.2 代表 -20%)
  customDropPercents?: Record<string, number>; // 個股獨立自訂跌幅 (e.g. { '2330': 0.15 })
}
