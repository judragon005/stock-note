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

export interface CoreBusinessPurityResult {
  purityRatio: number; // 營業利益 / 淨利 (%)
  isHighQuality: boolean; // 是否為高品質本業獲利 (>= 70%)
  warning?: string;
}

/**
 * 計算單季本業獲利純度 (calculateCoreBusinessPurity) (Ticket 06)
 * 揭露 EPS 暴衝是否來自一次性業外美化
 */
export function calculateCoreBusinessPurity(
  record: QuarterlyFinancialRecord
): CoreBusinessPurityResult {
  if (!record || !record.income) {
    return { purityRatio: 0, isHighQuality: false, warning: '無財務數據' };
  }

  const { operatingIncome, netIncome } = record.income;
  if (!netIncome || netIncome <= 0) {
    return {
      purityRatio: operatingIncome > 0 ? 100 : 0,
      isHighQuality: operatingIncome > 0,
      warning: netIncome < 0 ? '本季稅後淨利呈現虧損' : undefined,
    };
  }

  const purityRatio = safeDivide(operatingIncome, netIncome) * 100;
  const isHighQuality = purityRatio >= 70;
  let warning: string | undefined = undefined;

  if (purityRatio < 50) {
    warning = `本季業外損益佔比過高 (${(100 - purityRatio).toFixed(1)}%)，獲利多來自非本業收入，品質存疑`;
  } else if (purityRatio < 70) {
    warning = '本業營業利益佔比低於 70%，需留意業外波動';
  }

  return {
    purityRatio: Number(purityRatio.toFixed(2)),
    isHighQuality,
    warning,
  };
}

export interface OperatingLeverageResult {
  revenueYoY: number; // 營收年增率 %
  operatingIncomeYoY: number; // 營業利益年增率 %
  degreeOfOperatingLeverage: number; // 營運槓桿 DOL
  revenueAcceleration: number; // 營收成長加速度 ΔYoY %
  isExpanding: boolean; // 營運槓桿是否正向放大本業
}

/**
 * 計算營運槓桿係數 (DOL) 與營收成長加速度 (calculateOperatingLeverage) (Ticket 07)
 * DOL = 營業利益 YoY % / 營收 YoY %
 * 加速度 = 最新營收 YoY - 前一季營收 YoY
 */
export function calculateOperatingLeverage(
  records: QuarterlyFinancialRecord[]
): OperatingLeverageResult {
  if (!records || records.length < 2) {
    return {
      revenueYoY: 0,
      operatingIncomeYoY: 0,
      degreeOfOperatingLeverage: 1,
      revenueAcceleration: 0,
      isExpanding: false,
    };
  }

  // 排序由新到舊
  const sorted = [...records].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });

  const cur = sorted[0];
  // 找去年同季 (YoY)
  const yoyRecord = sorted.find((r) => r.year === cur.year - 1 && r.quarter === cur.quarter);
  const prevRecord = sorted[1];
  const baseline = yoyRecord || prevRecord;

  const curRev = cur.income?.revenue || 0;
  const baseRev = baseline?.income?.revenue || 0;
  const revenueYoY = baseRev > 0 ? ((curRev - baseRev) / baseRev) * 100 : 0;

  const curOp = cur.income?.operatingIncome || 0;
  const baseOp = baseline?.income?.operatingIncome || 0;
  const operatingIncomeYoY = baseOp !== 0 ? ((curOp - baseOp) / Math.abs(baseOp)) * 100 : 0;

  let degreeOfOperatingLeverage = 1;
  if (Math.abs(revenueYoY) > 0.001) {
    degreeOfOperatingLeverage = operatingIncomeYoY / revenueYoY;
  }

  // 計算上一期的 YoY 以推導加速度
  let revenueAcceleration = 0;
  if (prevRecord) {
    const prevYoyRecord = sorted.find(
      (r) => r.year === prevRecord.year - 1 && r.quarter === prevRecord.quarter
    );
    if (prevYoyRecord && (prevYoyRecord.income?.revenue || 0) > 0) {
      const prevRevYoY =
        (((prevRecord.income?.revenue || 0) - prevYoyRecord.income.revenue) /
          prevYoyRecord.income.revenue) *
        100;
      revenueAcceleration = revenueYoY - prevRevYoY;
    }
  }

  const isExpanding = revenueYoY > 0 && operatingIncomeYoY > revenueYoY;

  return {
    revenueYoY: Number(revenueYoY.toFixed(2)),
    operatingIncomeYoY: Number(operatingIncomeYoY.toFixed(2)),
    degreeOfOperatingLeverage: Number(degreeOfOperatingLeverage.toFixed(2)),
    revenueAcceleration: Number(revenueAcceleration.toFixed(2)),
    isExpanding,
  };
}
