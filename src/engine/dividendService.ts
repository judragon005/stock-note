/**
 * 上市公司公開歷年股利政策查詢服務 (Spec 0130)
 * Public Market Historical Dividend Service
 */

import { logger } from '../utils/logger';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import { deriveSharesOutstanding } from './keyMetricsEngine';

export interface CompanyDividendPolicyRecord {
  year: number;
  cashDividend: number;
  stockDividend: number;
  totalDividend: number;
  exDividendDate?: string;
  payDate?: string;
}

// 本地記憶體快取避免重複頻繁請求
const memoryCache = new Map<string, { records: CompanyDividendPolicyRecord[]; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小時
const MAX_CACHE_ENTRIES = 100; // 最大快取標的數，防止記憶體膨脹

/**
 * 從美股歷史季度財報 (現金流量表 dividendPaid) 反推歷年每股配息 (Spec 0202 - Ticket 06)
 */
export function deriveUsDividendsFromFinancials(
  records: QuarterlyFinancialRecord[]
): CompanyDividendPolicyRecord[] {
  if (!records || records.length === 0) return [];

  const yearMap = new Map<number, { totalDividendsPaid: number; shares: number }>();

  for (const r of records) {
    if (!r.year) continue;
    const divPaid = Math.abs(r.cashFlow?.dividendPaid ?? 0);
    if (divPaid <= 0) continue;

    const shares = deriveSharesOutstanding(r);
    if (!yearMap.has(r.year)) {
      yearMap.set(r.year, { totalDividendsPaid: 0, shares });
    }
    const bucket = yearMap.get(r.year)!;
    bucket.totalDividendsPaid += divPaid;
    if (shares > 0) bucket.shares = shares;
  }

  const result: CompanyDividendPolicyRecord[] = [];
  for (const [year, data] of yearMap.entries()) {
    if (data.shares <= 0) continue;
    const perShareDividend = Number((data.totalDividendsPaid / data.shares).toFixed(2));
    if (perShareDividend > 0) {
      result.push({
        year,
        cashDividend: perShareDividend,
        stockDividend: 0,
        totalDividend: perShareDividend,
      });
    }
  }

  return result.sort((a, b) => a.year - b.year);
}

/**
 * 測試輔助：重設記憶體快取
 */
export function resetDividendCacheForTesting(): void {
  memoryCache.clear();
}

/**
 * 查詢公開市場上市公司歷年每股配息政策 (Spec 0188 Lakehouse-First 本地優先)
 */
export async function fetchCompanyDividendHistory(
  symbol: string,
  market: 'TW' | 'US' = 'TW',
  token?: string
): Promise<CompanyDividendPolicyRecord[]> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `${market}_${cleanSymbol}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.records;
  }

  // 1. Lakehouse-First 本地優先檢索 (Spec 0188 Ticket 05)
  try {
    const localRes = await fetch(`/api/market/corporate-actions/${encodeURIComponent(cleanSymbol)}`);
    if (localRes.ok) {
      const localData = await localRes.json();
      if (Array.isArray(localData?.actions) && localData.actions.length > 0) {
        const records = localData.actions as CompanyDividendPolicyRecord[];
        if (memoryCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = memoryCache.keys().next().value;
          if (oldestKey) memoryCache.delete(oldestKey);
        }
        memoryCache.set(cacheKey, { records, timestamp: Date.now() });
        return records;
      }
    }
  } catch (err) {
    // 本地中介層未啟動或查無時，優雅降級
  }

  if (market === 'TW') {
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=${encodeURIComponent(
        cleanSymbol
      )}&start_date=2015-01-01${tokenParam}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data) && json.data.length > 0) {
          const mapByYear = new Map<number, CompanyDividendPolicyRecord>();

          for (const item of json.data) {
            const dateStr = item.date || item.CashExDividendTradingDate || item.AnnouncementDate;
            let year = dateStr ? new Date(dateStr).getFullYear() : 0;
            // 亦可解析 '112年' -> 2023
            if (!year && item.year) {
              const rocYear = parseInt(item.year.replace(/[^\d]/g, ''), 10);
              if (rocYear > 0) year = rocYear + 1911;
            }

            if (!year || year < 2010) continue;

            const cash = Number(
              ((item.CashEarningsDistribution || 0) + (item.CashStatutorySurplus || 0)).toFixed(2)
            );
            const stock = Number(
              ((item.StockEarningsDistribution || 0) + (item.StockStatutorySurplus || 0)).toFixed(2)
            );

            if (mapByYear.has(year)) {
              const existing = mapByYear.get(year)!;
              existing.cashDividend += cash;
              existing.stockDividend += stock;
              existing.totalDividend = Number(
                (existing.cashDividend + existing.stockDividend).toFixed(2)
              );
            } else {
              mapByYear.set(year, {
                year,
                cashDividend: cash,
                stockDividend: stock,
                totalDividend: Number((cash + stock).toFixed(2)),
                exDividendDate: item.CashExDividendTradingDate || undefined,
                payDate: item.CashDividendPaymentDate || undefined,
              });
            }
          }

          const records = Array.from(mapByYear.values()).sort((a, b) => a.year - b.year);
          if (records.length > 0) {
            if (memoryCache.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = memoryCache.keys().next().value;
              if (oldestKey) memoryCache.delete(oldestKey);
            }
            memoryCache.set(cacheKey, { records, timestamp: Date.now() });
            return records;
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to fetch TaiwanStockDividend for ${cleanSymbol}:`, err);
    }
  }

  // 兜底預設（若無網路或無法取得）
  return [];
}
