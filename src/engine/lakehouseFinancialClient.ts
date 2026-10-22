/**
/**
 * Lakehouse 財報三表客戶端中介服務 (Spec 0203 - Tickets 08, 09, 10)
 * 提供前端管線與本地 SQLite 湖倉財務表的高速雙向讀寫與回填自癒
 */

import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import { logger } from '../utils/logger';

export interface LakehouseFinancialRow {
  symbol: string;
  year: number;
  quarter: number;
  periodDate: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  accountsReceivable: number;
  inventory: number;
  cashAndEquivalents: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  shortTermDebt?: number | null;
  longTermDebt?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  capitalStock?: number | null;
  dividendPaid?: number | null;
  interestPaid?: number | null;
  source?: string;
  updatedAt?: string;
}

/**
 * 將 QuarterlyFinancialRecord 映射轉換為扁平 SQLite 湖倉列資料
 */
export function mapQuarterlyRecordToLakehouseRow(
  record: QuarterlyFinancialRecord,
  source: string = 'UNKNOWN'
): LakehouseFinancialRow {
  return {
    symbol: record.symbol.toUpperCase(),
    year: record.year,
    quarter: record.quarter,
    periodDate: record.periodDate,
    revenue: record.income?.revenue ?? 0,
    grossProfit: record.income?.grossProfit ?? 0,
    operatingIncome: record.income?.operatingIncome ?? 0,
    netIncome: record.income?.netIncome ?? 0,
    eps: record.income?.eps ?? 0,
    totalAssets: record.balanceSheet?.totalAssets ?? 0,
    totalLiabilities: record.balanceSheet?.totalLiabilities ?? 0,
    totalEquity: record.balanceSheet?.totalEquity ?? 0,
    accountsReceivable: record.balanceSheet?.accountsReceivable ?? 0,
    inventory: record.balanceSheet?.inventory ?? 0,
    cashAndEquivalents: record.balanceSheet?.cashAndEquivalents ?? 0,
    operatingCashFlow: record.cashFlow?.operatingCashFlow ?? 0,
    capitalExpenditure: record.cashFlow?.capitalExpenditure ?? 0,
    shortTermDebt: record.balanceSheet?.shortTermDebt ?? null,
    longTermDebt: record.balanceSheet?.longTermDebt ?? null,
    currentAssets: record.balanceSheet?.currentAssets ?? null,
    currentLiabilities: record.balanceSheet?.currentLiabilities ?? null,
    capitalStock: record.balanceSheet?.capitalStock ?? null,
    dividendPaid: record.cashFlow?.dividendPaid ?? null,
    interestPaid: record.cashFlow?.interestPaid ?? null,
    source,
  };
}

/**
 * 將扁平 SQLite 湖倉列資料映射轉換為標準 QuarterlyFinancialRecord
 */
export function mapLakehouseRowToQuarterlyRecord(
  row: LakehouseFinancialRow,
  defaultMarket: 'TW' | 'US' = 'TW'
): QuarterlyFinancialRecord {
  const isUS =
    row.source === 'SEC' ||
    row.source === 'FMP' ||
    (row.symbol.length <= 5 && isNaN(Number(row.symbol)));
  const market = isUS ? 'US' : defaultMarket;

  return {
    symbol: row.symbol.toUpperCase(),
    market,
    year: row.year,
    quarter: row.quarter,
    periodDate: row.periodDate,
    income: {
      revenue: row.revenue ?? 0,
      grossProfit: row.grossProfit ?? 0,
      operatingIncome: row.operatingIncome ?? 0,
      netIncome: row.netIncome ?? 0,
      eps: row.eps ?? 0,
    },
    balanceSheet: {
      totalAssets: row.totalAssets ?? 0,
      totalLiabilities: row.totalLiabilities ?? 0,
      totalEquity: row.totalEquity ?? 0,
      accountsReceivable: row.accountsReceivable ?? 0,
      inventory: row.inventory ?? 0,
      cashAndEquivalents: row.cashAndEquivalents ?? 0,
      currentAssets: row.currentAssets ?? undefined,
      currentLiabilities: row.currentLiabilities ?? undefined,
      capitalStock: row.capitalStock ?? undefined,
      shortTermDebt: row.shortTermDebt ?? undefined,
      longTermDebt: row.longTermDebt ?? undefined,
    },
    cashFlow: {
      operatingCashFlow: row.operatingCashFlow ?? 0,
      capitalExpenditure: row.capitalExpenditure ?? 0,
      stockBasedCompensation: 0,
      dividendPaid: row.dividendPaid ?? undefined,
      interestPaid: row.interestPaid ?? undefined,
    },
    auditInfo: {
      opinionType: 'UNREVIEWED',
      isBigFour: market === 'US',
    },
    updatedAt: Date.now(),
  };
}

/**
 * 優先自本地 SQLite 湖倉讀取歷史 16 核心財務三表
 */
export async function fetchLakehouseFinancials(
  symbol: string,
  defaultMarket: 'TW' | 'US' = 'TW'
): Promise<QuarterlyFinancialRecord[] | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  try {
    const res = await fetch(`/api/market/financials/${encodeURIComponent(cleanSymbol)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      const records = json.data.map((row: LakehouseFinancialRow) =>
        mapLakehouseRowToQuarterlyRecord(row, defaultMarket)
      );
      return records.sort((a: QuarterlyFinancialRecord, b: QuarterlyFinancialRecord) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter - a.quarter;
      });
    }
  } catch (err) {
    logger.debug(`[LakehouseClient] Fetch financials failed for ${cleanSymbol}:`, err);
  }
  return null;
}

/**
 * 當外部獲取新財報數據時，非同步回填寫入本機 SQLite 湖倉
 */
export async function backfillLakehouseFinancials(
  records: QuarterlyFinancialRecord[],
  source: string = 'FINMIND'
): Promise<boolean> {
  if (!records || records.length === 0) return false;
  try {
    const rows = records.map((r) => mapQuarterlyRecordToLakehouseRow(r, source));
    const res = await fetch('/api/market/financials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: rows }),
    });
    return res.ok;
  } catch (err) {
    logger.warn('[LakehouseClient] Failed to backfill financials into Lakehouse:', err);
    return false;
  }
}
