/**
 * 營運週轉效率與現金轉換週期 (CCC) 引擎 (Spec 0123)
 * Turnover Efficiency & Cash Conversion Cycle Engine
 */

import type {
  QuarterlyFinancialRecord,
  TurnoverMetrics,
} from '../types/financialForensic';

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * 計算單季營運週轉天數 (calculateTurnoverMetrics)
 * 季度化以 90 天為基準：
 * DSO = (accountsReceivable * 90) / revenue
 * DIO = (inventory * 90) / (revenue - grossProfit) [即 COGS 營業成本]
 * CCC = DSO + DIO - DPO
 */
export function calculateTurnoverMetrics(
  record: QuarterlyFinancialRecord,
  dpoDays = 0
): TurnoverMetrics {
  if (!record) {
    return {
      dsoDays: 0,
      dioDays: 0,
      dpoDays: 0,
      cccDays: 0,
    };
  }

  const { revenue, grossProfit } = record.income;
  const { accountsReceivable, inventory } = record.balanceSheet;

  // 1. 應收帳款週轉天數 (DSO)
  const dsoDays = safeDivide(accountsReceivable * 90, revenue);

  // 2. 存貨週轉天數 (DIO)
  const cogs = revenue - grossProfit;
  const dioDenominator = cogs > 0 ? cogs : revenue; // 若毛利大於營收或成本為 0，安全回退至營收
  const dioDays = safeDivide(inventory * 90, dioDenominator);

  // 3. 現金轉換週期 (CCC)
  const cccDays = dsoDays + dioDays - dpoDays;

  return {
    dsoDays: Number(dsoDays.toFixed(1)),
    dioDays: Number(dioDays.toFixed(1)),
    dpoDays: Number(dpoDays.toFixed(1)),
    cccDays: Number(cccDays.toFixed(1)),
  };
}

/**
 * 偵測週轉效率惡化 (detectTurnoverDeterioration)
 * records 預期按時間由新到舊排序 (records[0] 為最新一季)
 */
export function detectTurnoverDeterioration(records: QuarterlyFinancialRecord[]): {
  isDeteriorating: boolean;
  dsoIncrease: number;
  dioIncrease: number;
  warning?: string;
} {
  if (!records || records.length < 2) {
    return { isDeteriorating: false, dsoIncrease: 0, dioIncrease: 0 };
  }

  const latest = calculateTurnoverMetrics(records[0]);
  // 優先對比 4 季前 (同期 YoY)；若不足 4 季則對比最早可用季度
  const baselineIndex = Math.min(records.length - 1, 4);
  const baseline = calculateTurnoverMetrics(records[baselineIndex]);

  const dsoIncrease = Number((latest.dsoDays - baseline.dsoDays).toFixed(1));
  const dioIncrease = Number((latest.dioDays - baseline.dioDays).toFixed(1));

  // 判定門檻：DSO 增加 > 20 天 或 DIO 增加 > 25 天
  const isDeteriorating = dsoIncrease >= 20 || dioIncrease >= 25;

  let warning: string | undefined;
  if (isDeteriorating) {
    warning = `週轉效率明顯惡化：應收天數增加 ${dsoIncrease} 天，存貨週轉天數增加 ${dioIncrease} 天，需防範塞貨或庫存滯銷跌價風險。`;
  }

  return {
    isDeteriorating,
    dsoIncrease,
    dioIncrease,
    warning,
  };
}
