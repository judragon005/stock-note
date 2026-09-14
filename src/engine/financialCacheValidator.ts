/**
 * 財務報表快取完整性與自癒校驗器
 * Financial Records Cache Validator
 */

import type { QuarterlyFinancialRecord } from '../types/financialForensic';

/**
 * 檢驗本地快取紀錄是否具備三大報表完整性與會計平衡性 (Spec 0126 / Spec 0130)
 * 1. 若無現金流與資產負債（例如所有記錄的 CFO 均為 0 且資產總額均為 0），判定為無效殘缺快取。
 * 2. 若總資產存在，但所有季度的權益全為 0，或所有季度的負債全為 0，判定為殘缺舊快取需自癒。
 */
export function isFinancialRecordsCacheValid(records: QuarterlyFinancialRecord[]): boolean {
  if (!records || records.length === 0) return false;

  const hasValidCashFlow = records.some((r) => (r.cashFlow?.operatingCashFlow ?? 0) !== 0);
  const hasValidBalanceSheet = records.some((r) => (r.balanceSheet?.totalAssets ?? 0) !== 0);
  const hasValidEquity = records.some((r) => (r.balanceSheet?.totalEquity ?? 0) !== 0);
  const hasValidLiab = records.some((r) => (r.balanceSheet?.totalLiabilities ?? 0) !== 0);

  // 1. 若無現金流與資產負債，判定為無效快取
  if (!hasValidCashFlow && !hasValidBalanceSheet) {
    return false;
  }
  // 2. 若總資產存在，但負債或股東權益任一者在所有紀錄中全為 0，判定為殘缺舊快取需自癒重撈
  if (hasValidBalanceSheet && (!hasValidEquity || !hasValidLiab)) {
    return false;
  }

  return true;
}
