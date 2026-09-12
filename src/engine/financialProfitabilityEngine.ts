/**
 * 獲利能力與杜邦三因子分析引擎 (Spec 0123)
 * Financial Profitability & DuPont Analysis Engine
 */

import type {
  QuarterlyFinancialRecord,
  ProfitabilityMetrics,
  DuPontAnalysis,
} from '../types/financialForensic';

/**
 * 輔助函式：安全計算除法，防止除以零或溢出 NaN
 */
function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * 分析毛利率近幾季變動趨勢 (analyzeMarginTrend)
 * records 預期按時間由新到舊排序 (records[0] 為最新一季)
 */
export function analyzeMarginTrend(
  records: QuarterlyFinancialRecord[]
): 'EXPANDING' | 'STABLE' | 'CONTRACTING' {
  if (!records || records.length < 2) {
    return 'STABLE';
  }

  const latest = records[0];
  const previous = records[1];

  const latestMargin = safeDivide(latest.income.grossProfit, latest.income.revenue);
  const previousMargin = safeDivide(previous.income.grossProfit, previous.income.revenue);

  const diff = (latestMargin - previousMargin) * 100; // 百分點差距

  if (diff >= 1.5) {
    return 'EXPANDING';
  }
  if (diff <= -1.5) {
    return 'CONTRACTING';
  }
  return 'STABLE';
}

/**
 * 計算單季或最新季度之獲利能力核心指標 (calculateProfitabilityMetrics)
 */
export function calculateProfitabilityMetrics(
  records: QuarterlyFinancialRecord[]
): ProfitabilityMetrics {
  if (!records || records.length === 0) {
    return {
      grossMargin: 0,
      operatingMargin: 0,
      netMargin: 0,
      roe: 0,
      eps: 0,
      marginTrend: 'STABLE',
    };
  }

  const latest = records[0];
  const { revenue, grossProfit, operatingIncome, netIncome, eps } = latest.income;
  const equity = latest.balanceSheet.totalEquity;

  const grossMargin = safeDivide(grossProfit, revenue) * 100;
  const operatingMargin = safeDivide(operatingIncome, revenue) * 100;
  const netMargin = safeDivide(netIncome, revenue) * 100;
  const roe = safeDivide(netIncome, equity) * 100;

  const marginTrend = analyzeMarginTrend(records);

  return {
    grossMargin: Number(grossMargin.toFixed(2)),
    operatingMargin: Number(operatingMargin.toFixed(2)),
    netMargin: Number(netMargin.toFixed(2)),
    roe: Number(roe.toFixed(2)),
    eps: Number(eps.toFixed(2)),
    marginTrend,
  };
}

/**
 * 杜邦三因子拆解分析 (calculateDuPontAnalysis)
 * ROE = 淨利率 × 資產週轉率 × 權益乘數
 */
export function calculateDuPontAnalysis(record: QuarterlyFinancialRecord): DuPontAnalysis {
  if (!record) {
    return {
      roe: 0,
      netMargin: 0,
      assetTurnover: 0,
      equityMultiplier: 1,
      primaryDriver: 'PROFITABILITY',
    };
  }

  const { revenue, netIncome } = record.income;
  const { totalAssets, totalEquity } = record.balanceSheet;

  // 1. 淨利率 (Net Profit Margin)
  const netMargin = safeDivide(netIncome, revenue) * 100;

  // 2. 資產週轉率 (Asset Turnover)
  const assetTurnover = safeDivide(revenue, totalAssets);

  // 3. 權益乘數 / 財務槓桿 (Equity Multiplier)
  const equityMultiplier = totalEquity > 0 ? safeDivide(totalAssets, totalEquity, 1) : 1;

  // 4. 計算出的 ROE
  const roe = (netMargin / 100) * assetTurnover * equityMultiplier * 100;

  // 5. 判定主驅動因子 (Primary Driver)
  let primaryDriver: 'PROFITABILITY' | 'EFFICIENCY' | 'LEVERAGE' = 'PROFITABILITY';
  if (equityMultiplier >= 3.5 || (equityMultiplier > 2.5 && netMargin < 5)) {
    primaryDriver = 'LEVERAGE';
  } else if (assetTurnover >= 1.0) {
    primaryDriver = 'EFFICIENCY';
  }

  return {
    roe: Number(roe.toFixed(2)),
    netMargin: Number(netMargin.toFixed(2)),
    assetTurnover: Number(assetTurnover.toFixed(4)),
    equityMultiplier: Number(equityMultiplier.toFixed(2)),
    primaryDriver,
  };
}
