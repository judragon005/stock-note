import { MarketType } from '../types/stock';
import { fetchWithCORSProxy, normalizeYahooSymbol } from './priceFetcher';
import { logger } from '../utils/logger';
import { DailyCandle } from '../types/signal';

/**
 * 解析 Yahoo Finance Chart API 完整日 K 棒響應 (Open, High, Low, Close, Volume)
 */
export function parseYahooHistoricalCandlesResponse(data: any): DailyCandle[] {
  const candles: DailyCandle[] = [];
  try {
    if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      return candles;
    }

    const item = data.chart.result[0];
    const timestamps: number[] = item?.timestamp || [];
    const quote = item?.indicators?.quote?.[0];
    const opens: (number | null)[] = quote?.open || [];
    const highs: (number | null)[] = quote?.high || [];
    const lows: (number | null)[] = quote?.low || [];
    const closes: (number | null)[] = quote?.close || [];
    const volumes: (number | null)[] = quote?.volume || [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = closes[i];
      if (typeof ts === 'number' && typeof close === 'number' && !isNaN(close) && close > 0) {
        const dateObj = new Date(ts * 1000);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const open = typeof opens[i] === 'number' && !isNaN(opens[i]!) ? opens[i]! : close;
        const high = typeof highs[i] === 'number' && !isNaN(highs[i]!) ? highs[i]! : close;
        const low = typeof lows[i] === 'number' && !isNaN(lows[i]!) ? lows[i]! : close;
        const volume = typeof volumes[i] === 'number' && !isNaN(volumes[i]!) ? volumes[i]! : 0;

        candles.push({
          date: dateStr,
          open: Math.round(open * 1000) / 1000,
          high: Math.round(high * 1000) / 1000,
          low: Math.round(low * 1000) / 1000,
          close: Math.round(close * 1000) / 1000,
          volume,
        });
      }
    }
  } catch (err) {
    logger.error('Failed to parse Yahoo historical candles response:', err);
  }
  return candles;
}

/**
 * 解析 Yahoo Finance Chart API 歷史日 K 響應 (僅收盤價字典)
 */
export function parseYahooHistoricalChartResponse(data: any): Record<string, number> {
  const result: Record<string, number> = {};
  const candles = parseYahooHistoricalCandlesResponse(data);
  for (const c of candles) {
    result[c.date] = c.close;
  }
  return result;
}

/**
 * 比對現有快取，計算出缺漏的日期區間（若完全覆蓋則回傳 null）
 */
export function findMissingDateRanges(
  startDate: string,
  endDate: string,
  cachedPrices: Record<string, number> = {}
): { startDate: string; endDate: string } | null {
  const cachedDates = Object.keys(cachedPrices).filter((d) => cachedPrices[d] > 0).sort();

  if (cachedDates.length === 0) {
    return { startDate, endDate };
  }

  const earliestCached = cachedDates[0];
  const latestCached = cachedDates[cachedDates.length - 1];

  // 若快取的最後日期已經大於等於欲查詢的結束日期，且最早日期小於等於開始日期
  if (earliestCached <= startDate && latestCached >= endDate) {
    return null;
  }

  // 若結束日期較新，只需從 latestCached 的下一天抓到 endDate
  if (latestCached < endDate) {
    const nextDay = new Date(latestCached);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    const fetchStart = nextDayStr > startDate ? nextDayStr : startDate;
    return {
      startDate: fetchStart,
      endDate,
    };
  }

  return { startDate, endDate };
}

/**
 * 無損合併新舊歷史價格
 */
export function mergeHistoricalPrices(
  existing: Record<string, number> = {},
  incoming: Record<string, number> = {}
): Record<string, number> {
  return {
    ...existing,
    ...incoming,
  };
}

/**
 * 抓取單一標的之歷史每日收盤價 (支援增量抓取)
 */
export async function fetchSymbolHistoricalPrices(
  symbol: string,
  market: MarketType,
  startDate: string,
  endDate: string,
  existingCache: Record<string, number> = {},
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<Record<string, number>> {
  const missingRange = findMissingDateRanges(startDate, endDate, existingCache);
  if (!missingRange) {
    return existingCache;
  }

  const yahooSymbol = normalizeYahooSymbol(symbol, market);
  const period1 = Math.floor(new Date(`${missingRange.startDate}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${missingRange.endDate}T23:59:59Z`).getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const data = await customFetch(url, 6000);
    const newPrices = parseYahooHistoricalChartResponse(data);
    return mergeHistoricalPrices(existingCache, newPrices);
  } catch (err) {
    logger.warn(`Failed to fetch historical prices for ${symbol}:`, err);
    return existingCache;
  }
}

/**
 * 抓取歷史 USD/TWD 匯率 (USDTWD=X)
 */
export async function fetchHistoricalFxRates(
  startDate: string,
  endDate: string,
  existingCache: Record<string, number> = {},
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<Record<string, number>> {
  const missingRange = findMissingDateRanges(startDate, endDate, existingCache);
  if (!missingRange) {
    return existingCache;
  }

  const period1 = Math.floor(new Date(`${missingRange.startDate}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${missingRange.endDate}T23:59:59Z`).getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const data = await customFetch(url, 6000);
    const newRates = parseYahooHistoricalChartResponse(data);
    return mergeHistoricalPrices(existingCache, newRates);
  } catch (err) {
    logger.warn('Failed to fetch historical FX rates:', err);
    return existingCache;
  }
}
