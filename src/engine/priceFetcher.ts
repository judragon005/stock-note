import { MarketType, PriceQuote, ExchangeRateQuote } from '../types/stock';
import { parseYahooHistoricalCandlesResponse } from './historicalPriceFetcher';
import { globalRequestScheduler } from './rateLimiter';
import { STATIC_TW_STOCKS } from '../data/stockDictionary';
import { inspectRequestForCredentials, SecurityCredentialRoutingError } from './secureProxyRouter';

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * 透過本地代理、直連或 CORS 代理池發送請求，包含多代理重試與超時熔斷 (三層平滑降級)，並受全域速率限制保護
 */
export async function fetchWithCORSProxy(targetUrl: string, timeoutMs: number = 4000): Promise<any> {
  return globalRequestScheduler.schedule(targetUrl, async () => {
    // 1. 優先嘗試 Vite 本地開發代理路由
    let localProxyUrl: string | null = null;
    if (targetUrl.startsWith('https://query1.finance.yahoo.com')) {
      localProxyUrl = targetUrl.replace('https://query1.finance.yahoo.com', '/api/yahoo');
    } else if (targetUrl.startsWith('https://openapi.twse.com.tw')) {
      localProxyUrl = targetUrl.replace('https://openapi.twse.com.tw', '/api/twse');
    } else if (targetUrl.startsWith('https://www.twse.com.tw')) {
      localProxyUrl = targetUrl.replace('https://www.twse.com.tw', '/api/twse-www');
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
        // 若本地代理明確回傳 404 Not Found (例如 Yahoo 回應標的不存在或已下市)，立即 Fast-Fail，杜絕無謂的 24 秒外部代理輪詢
        if (res.status === 404) {
          throw new Error(`HTTP 404 Not Found: Target resource not found for ${targetUrl}`);
        }
      } catch (err: any) {
        if (err?.message?.includes('404')) {
          throw err;
        }
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
      if (directRes.status === 404) {
        throw new Error(`HTTP 404 Not Found: Target resource not found for ${targetUrl}`);
      }
    } catch (err: any) {
      if (err?.message?.includes('404')) {
        throw err;
      }
      // browser CORS fallback
    }

    // 3. 外部 CORS 代理池 (安全邊界：嚴格禁止攜帶敏感憑證的請求流向公共第三方代理)
    const inspection = inspectRequestForCredentials(targetUrl);
    if (inspection.hasCredentials) {
      throw new SecurityCredentialRoutingError(
        `[SecurityGuard] 偵測到請求含有敏感憑證 [${inspection.detectedKeyWords.join(', ')}]，已強制阻斷外發至公共 CORS 代理池以杜絕金鑰洩漏！`
      );
    }

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
  });
}

/**
 * 智能推斷標的所屬市場 (TW 或 US)
 */
export function inferMarketFromSymbol(rawInput: string): MarketType {
  const clean = (rawInput || '').trim().toUpperCase();
  if (!clean) return 'TW';

  // 1. 若顯式帶有市場後綴
  if (clean.endsWith('.TW') || clean.endsWith('.TWO')) return 'TW';
  if (clean.endsWith('.US')) return 'US';

  // 2. 判斷是否為台股代碼特徵：
  // - 4~6 碼純數字 (如 2330, 0050, 6204, 006204)
  // - 5~6 碼數字+英文字母 (如 00403A, 00981A, 2883B)
  if (/^\d{4,6}$/.test(clean)) return 'TW';
  if (/^\d{4,5}[A-Z]$/.test(clean)) return 'TW';

  // 3. 預設英文字母（如 AAPL, NVDA, BRK.B 等）為美股
  return 'US';
}

/// 上櫃標的快取集合，提供 O(1) 極致查詢效能與防禦性初始化
let otcSymbolSet: Set<string> | null = null;
function getOtcSymbolSet(): Set<string> {
  if (!otcSymbolSet && typeof STATIC_TW_STOCKS !== 'undefined' && Array.isArray(STATIC_TW_STOCKS)) {
    otcSymbolSet = new Set(
      STATIC_TW_STOCKS
        .filter((item) => item.source === 'TPEX' || item.category?.includes('上櫃'))
        .map((item) => item.symbol.toUpperCase())
    );
  }
  return otcSymbolSet || new Set();
}

/**
 * 依據標的與市場類型，產生 Yahoo Finance 候選查詢代碼清單 (支援雙軌與備援重試)
 * 例如台股 6204 -> ['6204.TWO', '6204.TW']
 * 例如台股 2330 -> ['2330.TW', '2330.TWO']
 * 例如美股 BRK.B -> ['BRK-B', 'BRK.B']
 * 例如美股 BRKB -> ['BRKB', 'BRK-B', 'BRK.B']
 */
export function getYahooCandidateSymbols(symbol: string, market: MarketType): string[] {
  let clean = symbol.trim().toUpperCase();
  if (!clean) return [];

  // 清洗常見前綴
  clean = clean.replace(/^(NASDAQ|NYSE|AMEX):/i, '');

  if (market === 'TW') {
    // 若已有顯式指定後綴
    if (clean.endsWith('.TWO')) {
      const base = clean.replace(/\.TWO$/i, '');
      return [clean, `${base}.TW`];
    }
    if (clean.endsWith('.TW')) {
      const base = clean.replace(/\.TW$/i, '');
      return [clean, `${base}.TWO`];
    }

    // 檢查字典是否已知為上櫃 (TPEX)
    const isKnownOtc = getOtcSymbolSet().has(clean);

    if (isKnownOtc) {
      return [`${clean}.TWO`, `${clean}.TW`];
    }
    return [`${clean}.TW`, `${clean}.TWO`];
  }

  // 美股處理
  // 1. 清洗 .US 後綴 (如 AAPL.US -> AAPL)
  clean = clean.replace(/\.US$/i, '');

  const candidates: string[] = [];

  // 2. 點號轉連字號 (如 BRK.B -> BRK-B)
  if (clean.includes('.')) {
    candidates.push(clean.replace(/\./g, '-'));
    candidates.push(clean);
  } else if (clean.includes('-')) {
    candidates.push(clean);
    candidates.push(clean.replace(/-/g, '.'));
  } else {
    candidates.push(clean);
    // 常見美股 Class A/B 股連寫 (如 BRKB -> BRK-B, BF.B 等)
    if (/^[A-Z]{3,4}[AB]$/.test(clean)) {
      candidates.push(`${clean.slice(0, -1)}-${clean.slice(-1)}`);
      candidates.push(`${clean.slice(0, -1)}.${clean.slice(-1)}`);
    } else if (clean.length === 5 && /^[A-Z]{5}$/.test(clean)) {
      candidates.push(`${clean.slice(0, 4)}-${clean.slice(4)}`);
    }
  }

  return Array.from(new Set(candidates));
}

/**
 * 正規化標的代碼為 Yahoo Finance 查詢代碼 (回傳主要候選代碼)
 */
export function normalizeYahooSymbol(symbol: string, market: MarketType): string {
  const candidates = getYahooCandidateSymbols(symbol, market);
  return candidates[0] || symbol.trim().toUpperCase();
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

    // 1. 優先提取 Yahoo Finance 官方計算之真實今日價差 (Change)
    let change: number | undefined = undefined;
    if (typeof meta.regularMarketChange === 'number') {
      change = meta.regularMarketChange;
    } else if (typeof meta.fulldayChange === 'number') {
      change = meta.fulldayChange;
    }

    // 2. 優先提取 Yahoo Finance 官方計算之真實今日漲跌幅 (ChangePercent)
    let changePercent: number | undefined = undefined;
    if (typeof meta.regularMarketChangePercent === 'number') {
      changePercent = meta.regularMarketChangePercent;
    } else if (typeof meta.fulldayChangePercent === 'number') {
      changePercent = meta.fulldayChangePercent;
    }

    // 3. 提取或安全推導昨日收盤價 (Previous Close)
    let prevClose: number = price;
    if (typeof meta.regularMarketPreviousClose === 'number' && meta.regularMarketPreviousClose > 0) {
      prevClose = meta.regularMarketPreviousClose;
    } else if (typeof meta.previousClose === 'number' && meta.previousClose > 0) {
      prevClose = meta.previousClose;
    } else if (typeof change === 'number') {
      // 若無顯式昨收價，依標準會計定義以現價減去今日價差精準倒推 (例如 27.27 - (-0.11) = 27.38)
      prevClose = Math.round((price - change) * 10000) / 10000;
    } else if (typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0) {
      // 僅作為最後完全缺失今日價差時之極弱備援
      prevClose = meta.chartPreviousClose;
    }

    // 4. 若 change 或 changePercent 尚未得出，依 prevClose 補齊
    if (change === undefined) {
      change = price - prevClose;
    }
    if (changePercent === undefined) {
      changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    }

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

    let change: number | undefined = undefined;
    if (typeof meta.regularMarketChange === 'number') {
      change = meta.regularMarketChange;
    } else if (typeof meta.fulldayChange === 'number') {
      change = meta.fulldayChange;
    }

    let changePercent: number | undefined = undefined;
    if (typeof meta.regularMarketChangePercent === 'number') {
      changePercent = meta.regularMarketChangePercent;
    } else if (typeof meta.fulldayChangePercent === 'number') {
      changePercent = meta.fulldayChangePercent;
    }

    let prevClose: number | undefined = undefined;
    if (typeof meta.regularMarketPreviousClose === 'number' && meta.regularMarketPreviousClose > 0) {
      prevClose = meta.regularMarketPreviousClose;
    } else if (typeof meta.previousClose === 'number' && meta.previousClose > 0) {
      prevClose = meta.previousClose;
    } else if (typeof change === 'number' && regularMarketPrice > 0) {
      prevClose = Math.round((regularMarketPrice - change) * 10000) / 10000;
    } else if (typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0) {
      prevClose = meta.chartPreviousClose;
    }

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

    if (change === undefined && prevClose && prevClose > 0) {
      change = rate - prevClose;
    }
    if (changePercent === undefined && prevClose && prevClose > 0 && typeof change === 'number') {
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

