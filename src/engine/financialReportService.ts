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
      records = await getStoredFinancialRecords(cleanSymbol);
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
