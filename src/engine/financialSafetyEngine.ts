/**
 * 財務結構、安全性與真實淨現金引擎 (Spec 0123)
 * Financial Safety, Solvency & Net Cash Engine
 */

import type {
  QuarterlyFinancialRecord,
  SafetyMetrics,
} from '../types/financialForensic';

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * 計算真實淨現金水位 (calculateNetCashPosition)
 * Net Cash = 現金及約當現金 - (短期借款 + 長期有息負債)
 */
export function calculateNetCashPosition(record: QuarterlyFinancialRecord): {
  netCash: number;
  isNetCashPositive: boolean;
} {
  if (!record) {
    return { netCash: 0, isNetCashPositive: false };
  }

  const { cashAndEquivalents, shortTermDebt, longTermDebt, totalLiabilities } = record.balanceSheet;

  let netCash: number;
  if (shortTermDebt !== undefined || longTermDebt !== undefined) {
    const totalInterestDebt = (shortTermDebt || 0) + (longTermDebt || 0);
    netCash = cashAndEquivalents - totalInterestDebt;
  } else {
    // 保守估算：以現金減總負債
    netCash = cashAndEquivalents - totalLiabilities;
  }

  return {
    netCash,
    isNetCashPositive: netCash > 0,
  };
}

/**
 * 評估流動性陷阱 (evaluateSolvencyRisk)
 * 破解「看似流動資產高，但裡面全是不值錢滯銷存貨」的假象
 */
export function evaluateSolvencyRisk(record: QuarterlyFinancialRecord): {
  hasLiquidityTrap: boolean;
  warning?: string;
} {
  if (!record) {
    return { hasLiquidityTrap: false };
  }

  const { totalLiabilities, accountsReceivable, inventory, cashAndEquivalents } = record.balanceSheet;
  const quickAssets = cashAndEquivalents + accountsReceivable;
  const totalCurrentAssetsEstimated = quickAssets + inventory;

  const quickRatio = totalLiabilities > 0 ? (quickAssets / totalLiabilities) * 100 : 999;
  const inventoryWeight = totalCurrentAssetsEstimated > 0 ? inventory / totalCurrentAssetsEstimated : 0;

  if (inventoryWeight >= 0.5 && quickRatio < 100) {
    return {
      hasLiquidityTrap: true,
      warning: `⚠️ 虛假流動性警示：流動資產中存貨佔比過高 (${(inventoryWeight * 100).toFixed(0)}%)，速動比率僅 ${quickRatio.toFixed(1)}% (< 100%)，實質償債流動性堪憂。`,
    };
  }

  return {
    hasLiquidityTrap: false,
  };
}

/**
 * 計算單季安全性核心指標 (calculateSafetyMetrics)
 */
export function calculateSafetyMetrics(record: QuarterlyFinancialRecord): SafetyMetrics {
  if (!record) {
    return {
      debtRatio: 0,
      quickRatio: 0,
      netCash: 0,
      isNetCashPositive: false,
    };
  }

  const { totalAssets, totalLiabilities, cashAndEquivalents, accountsReceivable } = record.balanceSheet;

  // 1. 負債比率 (Debt Ratio)
  const debtRatio = safeDivide(totalLiabilities, totalAssets) * 100;

  // 2. 速動比率 (Quick Ratio)
  const quickAssets = cashAndEquivalents + accountsReceivable;
  const quickRatio = totalLiabilities > 0 ? safeDivide(quickAssets, totalLiabilities) * 100 : 999;

  // 3. 真實淨現金
  const { netCash, isNetCashPositive } = calculateNetCashPosition(record);

  return {
    debtRatio: Number(debtRatio.toFixed(2)),
    quickRatio: Number(quickRatio.toFixed(2)),
    netCash,
    isNetCashPositive,
  };
}
