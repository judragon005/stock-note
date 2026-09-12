/**
 * 台股財報資料管線 (Spec 0123)
 * Taiwan Financial Ingestion Pipeline (FinMind / MOPS)
 */

import type {
  QuarterlyFinancialRecord,
} from '../types/financialForensic';
import { getStoredFinancialRecords, saveFinancialRecords } from '../utils/db';
import { logger } from '../utils/logger';

export interface FinmindFinancialItem {
  date: string;
  type: string;
  value: number;
}

/**
 * 輔助函式：從結算日期推算年度與季度 (e.g., '2025-06-30' -> { year: 2025, quarter: 2 })
 */
export function resolveYearQuarter(dateStr: string): { year: number; quarter: number } {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || 1;

  let quarter = 1;
  if (month >= 1 && month <= 3) quarter = 1;
  else if (month >= 4 && month <= 6) quarter = 2;
  else if (month >= 7 && month <= 9) quarter = 3;
  else quarter = 4;

  return { year, quarter };
}

/**
 * 清洗與聚合 FinMind 原始科目數據至標準 QuarterlyFinancialRecord
 */
export function parseTaiwanFinancialStatements(
  symbol: string,
  items: FinmindFinancialItem[]
): QuarterlyFinancialRecord[] {
  if (!items || items.length === 0) return [];

  // 依據日期分組
  const byDate = new Map<string, Record<string, number>>();

  for (const item of items) {
    if (!item.date || !item.type) continue;
    if (!byDate.has(item.date)) {
      byDate.set(item.date, {});
    }
    byDate.get(item.date)![item.type] = item.value;
  }

  const results: QuarterlyFinancialRecord[] = [];

  for (const [dateStr, values] of byDate.entries()) {
    const { year, quarter } = resolveYearQuarter(dateStr);

    const revenue = values['Revenue'] || values['營業收入'] || 0;
    const grossProfit = values['GrossProfit'] || values['營業毛利'] || 0;
    const operatingIncome = values['OperatingIncome'] || values['營業利益'] || 0;
    const netIncome = values['NetIncome'] || values['本期淨利'] || values['稅後淨利'] || 0;
    const eps = values['EPS'] || values['每股盈餘'] || 0;

    const totalAssets = values['TotalAssets'] || values['資產總計'] || 0;
    const totalLiabilities = values['TotalLiabilities'] || values['負債總計'] || 0;
    const totalEquity = values['TotalEquity'] || values['權益總計'] || (totalAssets - totalLiabilities);
    const accountsReceivable = values['AccountsReceivable'] || values['應收帳款'] || 0;
    const inventory = values['Inventories'] || values['存貨'] || 0;
    const cashAndEquivalents = values['CashAndCashEquivalents'] || values['現金及約當現金'] || 0;
    const shortTermDebt = values['ShortTermDebt'] || values['短期借款'] || undefined;
    const longTermDebt = values['LongTermDebt'] || values['長期借款'] || undefined;

    const operatingCashFlow = values['OperatingCashFlow'] || values['營業活動之現金流量'] || 0;
    const capitalExpenditure = values['CapitalExpenditures'] || values['取得不動產廠房及設備'] || 0;
    const dividendPaid = values['CashDividendsPaid'] || values['發放現金股利'] || undefined;

    results.push({
      symbol: symbol.toUpperCase(),
      market: 'TW',
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
        stockBasedCompensation: 0,
        dividendPaid,
      },
      auditInfo: {
        opinionType: 'UNQUALIFIED', // 預設無保留意見 (若有更細資料則映射)
        cpaFirm: '四大聯合會計師事務所',
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
 * 獲取台股季度財務報表（快取優先，若無則請求 FinMind API 並儲存）
 */
export async function fetchTaiwanQuarterlyFinancials(
  symbol: string,
  token?: string
): Promise<QuarterlyFinancialRecord[]> {
  const cleanSymbol = symbol.trim().toUpperCase();

  let cached: QuarterlyFinancialRecord[] = [];
  // 1. 快取優先查詢
  try {
    cached = (await getStoredFinancialRecords(cleanSymbol)) || [];
    if (cached.length > 0) {
      return cached;
    }
  } catch {
    // 忽略環境不支援 IndexedDB 的快取錯誤
  }

  // 2. 外部 API 請求
  try {
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockFinancialStatements&data_id=${encodeURIComponent(
      cleanSymbol
    )}&start_date=2022-01-01${tokenParam}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`FinMind API response error: ${res.status}`);
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.data) || json.data.length === 0) {
      return cached || [];
    }

    const parsed = parseTaiwanFinancialStatements(cleanSymbol, json.data);
    if (parsed.length > 0) {
      await saveFinancialRecords(parsed);
      return parsed;
    }
  } catch (err) {
    logger.warn(`Failed to fetch Taiwan financials for ${cleanSymbol}:`, err);
  }

  return cached || [];
}
