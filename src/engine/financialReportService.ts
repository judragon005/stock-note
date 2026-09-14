/**
 * 穿透式財報整合服務 (Spec 0123)
 * Financial Report Service
 */

import type { MarketType } from '../types/stock';
import type {
  FinancialForensicReport,
  QuarterlyFinancialRecord,
} from '../types/financialForensic';
import { getStoredFinancialRecords, saveFinancialRecords } from '../utils/db';
import { fetchTaiwanQuarterlyFinancials } from './taiwanFinancialPipeline';
import { fetchUSQuarterlyFinancials } from './usFinancialPipeline';
import { generateFinancialForensicReport } from './financialScoringEngine';
import { logger } from '../utils/logger';

export interface FinancialReportOptions {
  forceRefresh?: boolean;
  fmpApiKey?: string;
  finmindToken?: string;
}

/**
 * 檢驗本地快取紀錄是否具備三大報表完整性 (Spec 0126)
 * 若快取資料屬於先前舊版單表殘留（所有記錄的 CFO 均為 0 且資產總額均為 0），判定為無效殘缺快取。
 */
export function isFinancialRecordsCacheValid(records: QuarterlyFinancialRecord[]): boolean {
  if (!records || records.length === 0) return false;

  const hasValidCashFlow = records.some((r) => (r.cashFlow?.operatingCashFlow ?? 0) !== 0);
  const hasValidBalanceSheet = records.some((r) => (r.balanceSheet?.totalAssets ?? 0) !== 0);
  const hasValidEquityOrLiab = records.some(
    (r) => (r.balanceSheet?.totalEquity ?? 0) !== 0 || (r.balanceSheet?.totalLiabilities ?? 0) !== 0
  );

  // 若無現金流與資產負債，或總資產存在但負債與股東權益全為 0，判定為殘缺舊快取需自癒
  if (!hasValidCashFlow && !hasValidBalanceSheet) {
    return false;
  }
  if (hasValidBalanceSheet && !hasValidEquityOrLiab) {
    return false;
  }

  return true;
}

export async function loadOrFetchFinancialReport(
  symbol: string,
  market: MarketType,
  companyName: string = symbol,
  options: FinancialReportOptions = {}
): Promise<FinancialForensicReport> {
  const cleanSymbol = symbol.trim().toUpperCase();
  let records: QuarterlyFinancialRecord[] = [];

  if (!options.forceRefresh) {
    try {
      const stored = await getStoredFinancialRecords(cleanSymbol);
      if (isFinancialRecordsCacheValid(stored)) {
        records = stored;
      } else if (stored && stored.length > 0) {
        logger.info(`[financialReportService] 偵測到 ${cleanSymbol} 存在殘缺舊快取，自動觸發重撈自癒...`);
      }
    } catch (e) {
      logger.warn('[financialReportService] Failed to read from IndexedDB:', e);
    }
  }

  if (records.length === 0) {
    if (market === 'TW') {
      records = await fetchTaiwanQuarterlyFinancials(cleanSymbol, options.finmindToken);
    } else {
      records = await fetchUSQuarterlyFinancials(cleanSymbol, options.fmpApiKey);
    }

    if (records.length > 0) {
      try {
        await saveFinancialRecords(records);
      } catch (e) {
        logger.warn('[financialReportService] Failed to save to IndexedDB:', e);
      }
    }
  }

  return generateFinancialForensicReport(cleanSymbol, market, companyName, records);
}
