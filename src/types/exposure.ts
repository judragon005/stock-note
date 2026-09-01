import { HoldingPosition, LoanRecord } from './stock';

/**
 * 槓桿風險等級代碼
 */
export type LeverageRiskTier = 'CONSERVATIVE' | 'MODERATE' | 'ELEVATED' | 'HIGH_RISK';

/**
 * 槓桿風險等級資訊
 */
export interface LeverageRiskTierInfo {
  tier: LeverageRiskTier;
  label: string;
  badgeColor: string;
  description: string;
}

/**
 * 整戶總曝險與淨槓桿率指標
 */
export interface PortfolioExposureMetrics {
  totalStockValueTWD: number;         // 股票與證券資產總市值 (折合 TWD)
  totalAvailableCashTWD: number;      // 總可用現金 (含在途淨額，折合 TWD)
  totalDebtTWD: number;               // 總借款負債 (質押 + 融資，折合 TWD)
  navTWD: number;                     // 帳戶淨資產 NAV (總資產 - 總負債)
  grossExposureTWD: number;           // 總曝險額 (等同股票總市值)
  grossLeverage: number;              // 總槓桿率 (總股票市值 / NAV)
  netLeverage: number;                // 淨槓桿率 ((總股票市值 - max(0, 現金)) / NAV)
  cashToNavRatio: number;             // 現金佔淨資產比率
  riskTier: LeverageRiskTier;         // 槓桿風險等級
  riskInfo: LeverageRiskTierInfo;     // 風險等級詳細標籤與提示
  isUnderwater: boolean;              // 淨資產是否為負 (資不抵債)
}

/**
 * 在途資金摘要（可選）
 */
export interface InTransitCashParam {
  totalReceivableTWD?: number;
  totalPayableTWD?: number;
  netSettlementTWD?: number;
}

/**
 * 曝險引擎計算參數
 */
export interface CalculateExposureParams {
  holdings: HoldingPosition[];
  cashBalances: { TWD: number; USD: number };
  inTransitSummary?: InTransitCashParam;
  loans: LoanRecord[];
  usdToTwdRate: number;
  asOfDate?: string;
}
