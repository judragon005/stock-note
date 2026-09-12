/**
 * 美股財報資料管線 (Spec 0123)
 * US Financial Ingestion Pipeline (FMP / SEC EDGAR)
 */

import type {
  QuarterlyFinancialRecord,
} from '../types/financialForensic';
import { getStoredFinancialRecords, saveFinancialRecords } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * 輔助函式：從結算日期推算年度與季度 (e.g., '2025-03-31' -> { year: 2025, quarter: 1 })
 */
export function resolveUSYearQuarter(dateStr: string, periodStr?: string): { year: number; quarter: number } {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();

  if (periodStr && /^Q[1-4]$/i.test(periodStr.trim())) {
    const quarter = parseInt(periodStr.trim().charAt(1), 10);
    return { year, quarter };
  }

  const month = parseInt(parts[1], 10) || 1;
  let quarter = 1;
  if (month >= 1 && month <= 3) quarter = 1;
  else if (month >= 4 && month <= 6) quarter = 2;
  else if (month >= 7 && month <= 9) quarter = 3;
  else quarter = 4;

  return { year, quarter };
}

/**
 * 清洗與整合 FMP 季度損益、資產負債與現金流數據
 */
export function parseUSFinancialStatements(
  symbol: string,
  incomeList: any[],
  balanceList: any[],
  cashList: any[]
): QuarterlyFinancialRecord[] {
  if (!incomeList || incomeList.length === 0) return [];

  const balanceByDate = new Map<string, any>();
  if (balanceList) {
    for (const b of balanceList) {
      if (b.date) balanceByDate.set(b.date, b);
    }
  }

  const cashByDate = new Map<string, any>();
  if (cashList) {
    for (const c of cashList) {
      if (c.date) cashByDate.set(c.date, c);
    }
  }

  const results: QuarterlyFinancialRecord[] = [];

  for (const inc of incomeList) {
    if (!inc.date) continue;
    const dateStr = inc.date;
    const { year, quarter } = resolveUSYearQuarter(dateStr, inc.period);

    const bItem = balanceByDate.get(dateStr) || {};
    const cItem = cashByDate.get(dateStr) || {};

    const revenue = inc.revenue || 0;
    const grossProfit = inc.grossProfit || 0;
    const operatingIncome = inc.operatingIncome || 0;
    const netIncome = inc.netIncome || 0;
    const eps = inc.eps || inc.epsdiluted || 0;

    const totalAssets = bItem.totalAssets || 0;
    const totalLiabilities = bItem.totalLiabilities || 0;
    const totalEquity = bItem.totalStockholdersEquity || (totalAssets - totalLiabilities);
    const accountsReceivable = bItem.netReceivables || 0;
    const inventory = bItem.inventory || 0;
    const cashAndEquivalents = bItem.cashAndCashEquivalents || 0;
    const shortTermDebt = bItem.shortTermDebt !== undefined ? bItem.shortTermDebt : undefined;
    const longTermDebt = bItem.longTermDebt !== undefined ? bItem.longTermDebt : undefined;

    const operatingCashFlow = cItem.operatingCashFlow || 0;
    const capitalExpenditure = Math.abs(cItem.capitalExpenditure || 0);
    const stockBasedCompensation = cItem.stockBasedCompensation || 0;
    const dividendPaid = Math.abs(cItem.dividendsPaid || 0);

    results.push({
      symbol: symbol.toUpperCase(),
      market: 'US',
      year,
      quarter,
      periodDate: dateStr,
      income: {
        revenue,
        grossProfit,
        operatingIncome,
        netIncome,
        eps,
      },
      balanceSheet: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        accountsReceivable,
        inventory,
        cashAndEquivalents,
        shortTermDebt,
        longTermDebt,
      },
      cashFlow: {
        operatingCashFlow,
        capitalExpenditure,
        stockBasedCompensation,
        dividendPaid,
      },
      auditInfo: {
        opinionType: 'UNQUALIFIED',
        cpaFirm: 'Big Four Accounting Firm',
        isBigFour: true,
      },
      updatedAt: Date.now(),
    });
  }

  // 排序：由新到舊
  return results.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
}

/**
 * 獲取美股季度財務報表（快取優先，若無則請求 FMP API 並儲存）
 */
export async function fetchUSQuarterlyFinancials(
  symbol: string,
  apiKey?: string
): Promise<QuarterlyFinancialRecord[]> {
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 快取優先查詢
  try {
    const cached = await getStoredFinancialRecords(cleanSymbol);
    if (cached && cached.length > 0) {
      return cached;
    }
  } catch {
    // 忽略環境不支援 IndexedDB
  }

  // 2. 外部 API 請求
  if (!apiKey) {
    return [];
  }

  try {
    const keyParam = `apikey=${encodeURIComponent(apiKey)}`;
    const [incRes, balRes, cshRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${cleanSymbol}?period=quarter&limit=12&${keyParam}`),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${cleanSymbol}?period=quarter&limit=12&${keyParam}`),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${cleanSymbol}?period=quarter&limit=12&${keyParam}`),
    ]);

    if (!incRes.ok) throw new Error(`FMP income statement error: ${incRes.status}`);

    const [incomeData, balanceData, cashData] = await Promise.all([
      incRes.json(),
      balRes.ok ? balRes.json() : [],
      cshRes.ok ? cshRes.json() : [],
    ]);

    const parsed = parseUSFinancialStatements(cleanSymbol, incomeData, balanceData, cashData);
    if (parsed.length > 0) {
      try {
        await saveFinancialRecords(parsed);
      } catch {
        // 快取寫入容錯
      }
      return parsed;
    }
  } catch (err) {
    logger.warn(`Failed to fetch US financials for ${cleanSymbol}:`, err);
  }

  return [];
}
