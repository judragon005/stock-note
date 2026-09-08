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

/**
 * 壓力情境定義
 */
export interface StressScenarioConfig {
  id: string;
  name: string;
  description: string;
  marketDropPercent: number;          // 通用大盤跌幅 (0 ~ 1，例如 0.1 代表 -10%)
  applyExDividendDrop: boolean;       // 是否疊加除息除權跳水扣減
  customSymbolDrops?: Record<string, number>; // 個股特定跌幅覆寫
}

/**
 * 單一情境評估結果
 */
export interface StressScenarioResult {
  scenario: StressScenarioConfig;
  stressedCollateralValueTWD: number;
  stressedMaintenanceRatio: number;
  statusInfo: MarginMaintenanceInfo;
  dropInRatioPoints: number;          // 維持率衰減點數 (如 -35.2%)
  repayCashNeededFor166: number;      // 方案 A: 償還借款本金至 166% 水位所需金額
  depositCashNeededFor166: number;    // 方案 B: 補充現金擔保品至 166% 水位所需金額
  repayCashNeededFor130: number;      // 方案 A: 償還借款本金至 130% 斷頭線所需金額 (若已斷頭)
  depositCashNeededFor130: number;    // 方案 B: 補充現金擔保品至 130% 斷頭線所需金額
}

/**
 * 單一標的斷頭臨界價格指標
 */
export interface LiquidationThresholdItem {
  symbol: string;
  name: string;
  currentPrice: number;
  pledgedShares: number;
  collateralWeightPercent: number;     // 佔總擔保品市值比例 %
  priceAt166Healthy: number;           // 觸發 166% 健康水位之臨界價格 (TWD)
  priceAt140Warning: number;           // 觸發 140% 警戒預警之臨界價格 (TWD)
  priceAt130MarginCall: number;        // 觸發 130% 斷頭追繳之臨界價格 (TWD)
  maxDropPercentTo130: number;         // 距 130% 斷頭之最大耐受跌幅 (0 ~ 1, 例如 0.35 代表可承受 35% 跌幅)
  isImmuneToLiquidation: boolean;      // 是否即便該標的歸零，其餘擔保品仍足以支撐整戶在 130% 以上
}

/**
 * 一鍵逃生救援方案 (Emergency Escape Plan)
 */
export interface EmergencyEscapePlan {
  targetRatio: number;                 // 目標安全維持率 (例如 166% 或 200%)
  currentRatio: number;                // 當前或情境維持率
  isAlreadySafe: boolean;              // 當前是否已達到或高於目標水位
  repayPrincipalCashTWD: number;       // 方案 A: 臨櫃/線上償還借款本金 (減少分母)
  depositCashCollateralTWD: number;    // 方案 B: 匯入現金擔保品至專戶 (增加分子)
  additionalSharesRequired: {          // 方案 C: 加質現有持股
    symbol: string;
    name: string;
    shares: number;
    sharePrice: number;
    addedValueTWD: number;
  }[];
}

/**
 * 壓力測試矩陣整體結果
 */
export interface MarginStressMatrixResult {
  hasLoans: boolean;
  totalLoanDebtTWD: number;
  currentCollateralValueTWD: number;
  currentMaintenanceRatio: number;
  currentStatusInfo: MarginMaintenanceInfo;
  rows: StressScenarioResult[];
  liquidationThresholds: LiquidationThresholdItem[];
  escapePlanFor166: EmergencyEscapePlan;
  escapePlanFor200: EmergencyEscapePlan;
}

/**
 * 矩陣運算輸入參數
 */
export interface EvaluateMarginStressMatrixParams {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  usdToTwdRate: number;
  scenarios?: StressScenarioConfig[];
  dividendPerShareMap?: Record<string, number>; // 個股預計除息金額 (例如 { '2330': 4.0, '0050': 3.5 })
}

/**
 * 預設標準壓力測試情境
 */
export const DEFAULT_STRESS_SCENARIOS: StressScenarioConfig[] = [
  {
    id: 'CORRECTION_5',
    name: '常態微幅回檔 (-5%)',
    description: '市場健康整理回檔 5%，檢驗日常波動承受力。',
    marketDropPercent: 0.05,
    applyExDividendDrop: false,
  },
  {
    id: 'CORRECTION_10',
    name: '技術性修正 (-10%)',
    description: '進入修正區間跌幅 10%，檢驗警戒線防守。',
    marketDropPercent: 0.10,
    applyExDividendDrop: false,
  },
  {
    id: 'BEAR_20',
    name: '空頭熊市重挫 (-20%)',
    description: '標的或大盤跌幅達 20%，逼近法定追繳考驗。',
    marketDropPercent: 0.20,
    applyExDividendDrop: false,
  },
  {
    id: 'BLACK_SWAN_30',
    name: '黑天鵝崩盤 (-30%)',
    description: '突發性連續跌停或地緣危機重挫 30%，極端壓力測試。',
    marketDropPercent: 0.30,
    applyExDividendDrop: false,
  },
  {
    id: 'EX_DIVIDEND_ONLY',
    name: '除權息假性跳水',
    description: '擔保品除權息扣減市值，股息尚未入帳之空窗期衝擊。',
    marketDropPercent: 0.0,
    applyExDividendDrop: true,
  },
  {
    id: 'COMPOUND_BLACK_SWAN',
    name: '黑天鵝複合衝擊 (-20% + 除息)',
    description: '除權息跳水疊加大盤重挫 20% 之最嚴苛極端複合情境。',
    marketDropPercent: 0.20,
    applyExDividendDrop: true,
  },
];

