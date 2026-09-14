/**
 * 上市公司公開歷年股利政策查詢服務 (Spec 0130)
 * Public Market Historical Dividend Service
 */

import { logger } from '../utils/logger';

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

/**
 * 查詢公開市場上市公司歷年每股配息政策
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
