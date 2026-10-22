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

import { isFinancialRecordsCacheValid } from './financialCacheValidator';
export { isFinancialRecordsCacheValid };

export async function loadOrFetchFinancialReport(
  symbol: string,
  market: MarketType,
  companyName: string = symbol,
  options: FinancialReportOptions = {}
): Promise<FinancialForensicReport> {
  const cleanSymbol = symbol.trim().toUpperCase();
  let records: QuarterlyFinancialRecord[] = [];
  let storedFallback: QuarterlyFinancialRecord[] = [];

  // 1. 讀取 IndexedDB 快取
  try {
    const stored = await getStoredFinancialRecords(cleanSymbol);
    if (stored && stored.length > 0) {
      storedFallback = stored;
      if (!options.forceRefresh && isFinancialRecordsCacheValid(stored)) {
        records = stored;
      } else if (!options.forceRefresh) {
        logger.info(`[financialReportService] 偵測到 ${cleanSymbol} 存在殘缺舊快取，自動觸發重撈自癒...`);
      }
    }
  } catch (e) {
    logger.warn('[financialReportService] Failed to read from IndexedDB:', e);
  }

  // 2. 若無有效快取或強制刷新，發起遠端拉取 (包含 429/網路超時防白屏保護)
  if (records.length === 0) {
    try {
      if (market === 'TW') {
        records = options.forceRefresh
          ? await fetchTaiwanQuarterlyFinancials(cleanSymbol, options.finmindToken, true)
          : await fetchTaiwanQuarterlyFinancials(cleanSymbol, options.finmindToken);
      } else {
        records = options.forceRefresh
          ? await fetchUSQuarterlyFinancials(cleanSymbol, options.fmpApiKey, true)
          : await fetchUSQuarterlyFinancials(cleanSymbol, options.fmpApiKey);
      }

      if (records.length > 0) {
        try {
          await saveFinancialRecords(records);
        } catch (e) {
          logger.warn('[financialReportService] Failed to save to IndexedDB:', e);
        }
      }
    } catch (err) {
      logger.warn(`[financialReportService] 遠端請求失敗或遭遇 429 限流 (${cleanSymbol})，啟動離線防崩潰降級:`, err);
      // 若遠端失敗但本地有過期歷史資料，降級回退使用既有資料，絕不拋錯白屏
      if (storedFallback.length > 0) {
        records = storedFallback;
      } else {
        records = [];
      }
    }
  }

  return generateFinancialForensicReport(cleanSymbol, market, companyName, records);
}
