import { MarketType } from '../types/stock';
import { DailyCandle, MuscleBookerIndicatorPoint } from '../types/indicators';
import { saveSymbolOhlcv, saveSymbolIndicators } from '../utils/db';
import { logger } from '../utils/logger';

export interface CachedStockData {
  symbol: string;
  name: string;
  date: string;
  quote?: DailyCandle | null;
  chips?: {
    foreignNetShares: number;
    trustNetShares: number;
    dealerNetShares: number;
    totalNetShares: number;
  } | null;
  indicator?: MuscleBookerIndicatorPoint | null;
}

export interface MarketCacheSummary {
  date: string;
  updatedAt: number;
  market: MarketType;
  totalSymbols: number;
  failedSymbols?: string[];
  durationMs: number;
  stocks: Record<string, CachedStockData>;
}

/**
 * 載入本地盤後快取總表 (0 網路延遲，熱載入秒讀)
 */
export async function loadMarketCacheSummary(
  market: MarketType
): Promise<MarketCacheSummary | null> {
  const fileName = market === 'TW' ? 'tw_market_summary.json' : 'us_market_summary.json';
  const cacheUrl = `/market-cache/${fileName}?_t=${Date.now()}`;

  try {
    const res = await fetch(cacheUrl);
    if (!res.ok) {
      return null;
    }
    const data: MarketCacheSummary = await res.json();
    return data;
  } catch (err) {
    logger.warn(`無法載入本地市場快取 [${market}]:`, err);
    return null;
  }
}

/**
 * 將快取資料在瀏覽器閒置時非同步批量同步至 IndexedDB
 */
export async function syncMarketCacheToIndexedDB(
  summary: MarketCacheSummary
): Promise<void> {
  if (!summary || !summary.stocks) return;

  const market = summary.market;
  const entries = Object.entries(summary.stocks);

  for (const [symbol, item] of entries) {
    try {
      if (item.quote) {
        await saveSymbolOhlcv({
          symbol,
          market,
          candles: [item.quote],
          updatedAt: Date.now(),
        });
      }
      if (item.indicator) {
        await saveSymbolIndicators({
          symbol,
          market,
          points: [item.indicator],
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      // 單檔寫入異常不阻斷整體流程
      logger.warn(`IndexedDB 快取沉澱跳過 [${symbol}]:`, err);
    }
  }
}

/**
 * 緊湊日 K 原始結構 { d, o, h, l, c, v }
 */
export interface RawCompactCandle {
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

let compactHistoryPromise: Promise<Record<string, RawCompactCandle[]> | null> | null = null;

/**
 * 重設緊湊日 K 記憶體快取 (僅供測試或強制重載調用)
 */
export function resetCompactHistoryCache(): void {
  compactHistoryPromise = null;
}

/**
 * 按需載入台股全市場緊湊歷史日 K 數列並提取特定標的 (單例請求防重複)
 */
export async function loadSymbolCompactHistory(
  symbol: string
): Promise<DailyCandle[] | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  if (!compactHistoryPromise) {
    compactHistoryPromise = (async () => {
      try {
        const res = await fetch('/market-cache/tw_market_ohlcv_compact.json');
        if (!res.ok) {
          logger.warn(`無法讀取 tw_market_ohlcv_compact.json (HTTP ${res.status})`);
          return null;
        }
        const data: Record<string, RawCompactCandle[]> = await res.json();
        return data;
      } catch (err) {
        logger.warn('載入 tw_market_ohlcv_compact.json 失敗:', err);
        return null;
      }
    })();
  }

  const allCompact = await compactHistoryPromise;
  if (!allCompact || !allCompact[cleanSym] || allCompact[cleanSym].length === 0) {
    return null;
  }

  return allCompact[cleanSym].map((c) => ({
    date: c.d,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));
}

/**
 * 從每日盤後總表快取取得標的當日最新單筆行情 (若存在)
 */
export async function getLatestSummaryQuote(
  symbol: string
): Promise<DailyCandle | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
  const summary = await loadMarketCacheSummary('TW');
  if (!summary || !summary.stocks) return null;

  const stock = summary.stocks[cleanSym] || summary.stocks[symbol];
  return stock?.quote || null;
}

