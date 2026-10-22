/**
 * 財務報表快取完整性與自癒校驗器
 * Financial Records Cache Validator
 */

import type { QuarterlyFinancialRecord } from '../types/financialForensic';

/**
 * 財務報表快取預設有效期限 (120 天，約一季加上法定 30~45 天公告緩衝期)
 */
export const FINANCIAL_CACHE_TTL_MS = 120 * 24 * 60 * 60 * 1000;

/**
 * 檢驗本地快取紀錄是否具備三大報表完整性、會計平衡性與時效性 (Spec 0126 / Spec 0130 / Spec 0202)
 * 1. 時效性 TTL 校驗：最新一筆紀錄更新時間若超過 120 天，判定過期需重撈。
 * 2. 若無現金流與資產負債（例如所有記錄的 CFO 均為 0 且資產總額均為 0），判定為無效殘缺快取。
 * 3. 若總資產存在，但所有季度的權益全為 0，或所有季度的負債全為 0，判定為殘缺舊快取需自癒。
 */
export function isFinancialRecordsCacheValid(
  records: QuarterlyFinancialRecord[],
  maxAgeMs: number = FINANCIAL_CACHE_TTL_MS
): boolean {
  if (!records || records.length === 0) return false;

  // 1. 時效性 TTL 校驗
  const latestUpdatedAt = Math.max(...records.map((r) => r.updatedAt || 0));
  if (latestUpdatedAt > 0 && Date.now() - latestUpdatedAt > maxAgeMs) {
    return false;
  }

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
