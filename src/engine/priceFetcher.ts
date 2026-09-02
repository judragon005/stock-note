import { MarketType, PriceQuote, ExchangeRateQuote } from '../types/stock';
import { parseYahooHistoricalCandlesResponse } from './historicalPriceFetcher';

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * 透過本地代理、直連或 CORS 代理池發送請求，包含多代理重試與超時熔斷 (三層平滑降級)
 */
export async function fetchWithCORSProxy(targetUrl: string, timeoutMs: number = 4000): Promise<any> {
  // 1. 優先嘗試 Vite 本地開發代理路由
  let localProxyUrl: string | null = null;
  if (targetUrl.startsWith('https://query1.finance.yahoo.com')) {
    localProxyUrl = targetUrl.replace('https://query1.finance.yahoo.com', '/api/yahoo');
  } else if (targetUrl.startsWith('https://openapi.twse.com.tw')) {
    localProxyUrl = targetUrl.replace('https://openapi.twse.com.tw', '/api/twse');
  } else if (targetUrl.startsWith('https://www.tpex.org.tw')) {
    localProxyUrl = targetUrl.replace('https://www.tpex.org.tw', '/api/tpex');
  }

  if (localProxyUrl && typeof window !== 'undefined') {
    try {
      const res = await fetch(localProxyUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. 嘗試直連 (Node 環境)
  try {
    const directRes = await fetch(targetUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (directRes.ok) {
      const text = await directRes.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  } catch {
    // browser CORS fallback
  }

  // 3. 外部 CORS 代理池
  let lastError: Error | null = null;
  for (const getProxyUrl of CORS_PROXIES) {
    const proxyUrl = getProxyUrl(targetUrl);
    try {
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`All CORS proxies failed for ${targetUrl}`);
}

/**
 * 正規化標的代碼為 Yahoo Finance 查詢代碼
 */
export function normalizeYahooSymbol(symbol: string, market: MarketType): string {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (market === 'TW') {
    if (cleanSymbol.endsWith('.TW') || cleanSymbol.endsWith('.TWO')) {
      return cleanSymbol;
    }
    return `${cleanSymbol}.TW`;
  }
  // 美股特殊代碼處理 (如 BRK.B 轉為 BRK-B)
  return cleanSymbol.replace(/\./g, '-');
}

/**
 * 解析 Yahoo Finance Chart API v8 響應格式
 */
export function parseYahooQuoteResponse(data: any, rawSymbol: string, market: MarketType): PriceQuote | null {
  try {
    if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      return null;
    }

    const meta = data.chart.result[0]?.meta;
    if (!meta) return null;

    const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : 0;
    if (price <= 0) return null;

    const prevClose =
      typeof meta.chartPreviousClose === 'number'
        ? meta.chartPreviousClose
        : typeof meta.previousClose === 'number'
        ? meta.previousClose
        : price;

    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const currency = market === 'TW' ? 'TWD' : 'USD';
    const candles = parseYahooHistoricalCandlesResponse(data);

    return {
      symbol: rawSymbol,
      market,
      price,
      previousClose: prevClose,
      change,
      changePercent,
      currency,
      status: 'DELAYED',
      updatedAt: (meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()),
      source: 'YAHOO',
      candles: candles && candles.length > 0 ? candles : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 解析 TWSE 官方 OpenAPI (STOCK_DAY_ALL) 每日收盤價
 */
export function parseTWSEDayAllResponse(data: any, rawSymbol: string): PriceQuote | null {
  try {
    if (!Array.isArray(data)) return null;

    const cleanSymbol = rawSymbol.replace(/\.(TW|TWO)$/i, '').trim();
    const item = data.find((row: any) => String(row.Code).trim() === cleanSymbol);

    if (!item) return null;

    const price = parseFloat(String(item.ClosingPrice).replace(/,/g, ''));
    if (isNaN(price) || price <= 0) return null;

    let change = 0;
    if (item.Change) {
      const changeStr = String(item.Change).replace(/,/g, '').trim();
      change = parseFloat(changeStr) || 0;
    }

    const prevClose = price - change;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol: rawSymbol,
      market: 'TW',
      price,
      previousClose: prevClose,
      change,
      changePercent,
      currency: 'TWD',
      status: 'PREVIOUS_CLOSE',
      updatedAt: Date.now(),
      source: 'TWSE',
    };
  } catch {
    return null;
  }
}

/**
 * 抓取單一標的之最新報價，支援 Yahoo 優先與 TWSE 備援
 */
export async function fetchStockQuote(
  symbol: string,
  market: MarketType,
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<PriceQuote | null> {
  const yahooSymbol = normalizeYahooSymbol(symbol, market);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=3mo`;

  // 1. 嘗試 Yahoo Finance API (Primary)
  try {
    const data = await customFetch(yahooUrl, 4000);
    const quote = parseYahooQuoteResponse(data, symbol, market);
    if (quote) return quote;
  } catch {
    // 若為台股且上櫃可能為 .TWO，嘗試切換後綴
    if (market === 'TW' && yahooSymbol.endsWith('.TW')) {
      const otcSymbol = `${symbol.replace(/\.TW$/i, '')}.TWO`;
      const otcUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${otcSymbol}?interval=1d&range=3mo`;
      try {
        const otcData = await customFetch(otcUrl, 3000);
        const otcQuote = parseYahooQuoteResponse(otcData, symbol, market);
        if (otcQuote) return otcQuote;
      } catch {
        // Continue to fallback
      }
    }
  }

  // 2. 若為台股且 Yahoo 失敗，嘗試台灣證交所官方 OpenAPI (Fallback)
  if (market === 'TW') {
    try {
      const twseUrl = `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL`;
      const twseData = await customFetch(twseUrl, 4000);
      const twseQuote = parseTWSEDayAllResponse(twseData, symbol);
      if (twseQuote) return twseQuote;
    } catch {
      // Fallback failed
    }
  }

  return null;
}

/**
 * 批次並行抓取多檔標的之最新報價
 */
export async function fetchBatchStockQuotes(
  symbols: { symbol: string; market: MarketType }[],
  fetcher: typeof fetchStockQuote = fetchStockQuote
): Promise<Record<string, PriceQuote>> {
  const results: Record<string, PriceQuote> = {};

  const promises = symbols.map(async (item) => {
    try {
      const quote = await fetcher(item.symbol, item.market);
      if (quote) {
        results[item.symbol] = quote;
      }
    } catch {
      // Ignore individual failures in batch
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * 解析 Yahoo Finance USDTWD=X 匯率響應
 */
export function parseYahooExchangeRateResponse(data: any): ExchangeRateQuote | null {
  try {
    if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      return null;
    }

    const meta = data.chart.result[0]?.meta;
    if (!meta) return null;

    const regularMarketPrice = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : 0;
    const prevClose =
      typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
        ? meta.chartPreviousClose
        : typeof meta.previousClose === 'number' && meta.previousClose > 0
        ? meta.previousClose
        : undefined;

    let rate = regularMarketPrice;
    let status: 'REALTIME' | 'PREVIOUS_CLOSE' = 'REALTIME';

    if (rate <= 0) {
      if (prevClose && prevClose > 0) {
        rate = prevClose;
        status = 'PREVIOUS_CLOSE';
      } else {
        return null;
      }
    }

    let change: number | undefined = undefined;
    let changePercent: number | undefined = undefined;

    if (prevClose && prevClose > 0) {
      change = rate - prevClose;
      changePercent = (change / prevClose) * 100;
    }

    return {
      rate,
      prevClose,
      change,
      changePercent,
      status,
      updatedAt: Date.now(),
      source: 'YAHOO',
    };
  } catch {
    return null;
  }
}

/**
 * 抓取最新 USD/TWD 匯率 (Yahoo Finance USDTWD=X)
 */
export async function fetchExchangeRate(
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<ExchangeRateQuote | null> {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?interval=1d&range=1d`;
  try {
    const data = await customFetch(yahooUrl, 4000);
    const quote = parseYahooExchangeRateResponse(data);
    if (quote) return quote;
  } catch {
    // Return null so caller can gracefully fallback to LocalStorage cached rate
  }
  return null;
}

