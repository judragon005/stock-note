import { MarketType } from '../types/stock';
import { DailyCandle, MuscleBookerIndicatorPoint } from '../types/indicators';
import { fetchWithCORSProxy, normalizeYahooSymbol } from './priceFetcher';
import { parseYahooHistoricalCandlesResponse } from './historicalPriceFetcher';
import { calculateMuscleBookerIndicators } from './muscleBookerEngine';
import {
  getSymbolOhlcv,
  saveSymbolOhlcv,
  getSymbolIndicators,
  saveSymbolIndicators,
} from '../utils/db';
import { logger } from '../utils/logger';

// 預設快取新鮮度：當日已收盤或 6 小時內不重複請求外部全量
const CACHE_FRESHNESS_MS = 6 * 60 * 60 * 1000;

/**
 * 增量合併兩組日 K 線數列，以日期為唯一鍵，同日期以最新數據覆蓋，並按日期升冪排序
 */
export function mergeDailyCandles(
  existing: DailyCandle[],
  incoming: DailyCandle[]
): DailyCandle[] {
  const map = new Map<string, DailyCandle>();

  for (const c of existing) {
    map.set(c.date, c);
  }
  for (const c of incoming) {
    map.set(c.date, c);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 回補單一標的全量歷史日 K (OHLCV) 與肌肉書僮技術指標
 */
export async function backfillSymbolOhlcvAndIndicators(
  symbol: string,
  market: MarketType,
  forceRefresh: boolean = false
): Promise<{
  candles: DailyCandle[];
  indicators: MuscleBookerIndicatorPoint[];
}> {
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 檢查本地 IndexedDB 快取
  if (!forceRefresh) {
    try {
      const cachedOhlcv = await getSymbolOhlcv(cleanSymbol);

      if (
        cachedOhlcv &&
        cachedOhlcv.candles.length > 0 &&
        Date.now() - cachedOhlcv.updatedAt < CACHE_FRESHNESS_MS
      ) {
        let indicators: MuscleBookerIndicatorPoint[] = [];
        try {
          const cachedIndicators = await getSymbolIndicators(cleanSymbol);
          if (cachedIndicators && cachedIndicators.points.length > 0) {
            indicators = cachedIndicators.points;
          } else {
            indicators = calculateMuscleBookerIndicators(cachedOhlcv.candles);
          }
        } catch {
          indicators = calculateMuscleBookerIndicators(cachedOhlcv.candles);
        }

        return {
          candles: cachedOhlcv.candles,
          indicators,
        };
      }
    } catch (err) {
      logger.warn(`Failed to read local OHLCV cache for ${cleanSymbol}:`, err);
    }
  }

  // 2. 透過 Yahoo Finance Chart API 拉取完整歷史 OHLCV
  // period1=0 代表自該標的掛牌上市日開始
  const yahooSymbol = normalizeYahooSymbol(cleanSymbol, market);
  const nowSec = Math.floor(Date.now() / 1000);
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?period1=0&period2=${nowSec}&interval=1d`;

  let fetchedCandles: DailyCandle[] = [];
  try {
    const data = await fetchWithCORSProxy(targetUrl, 8000);
    fetchedCandles = parseYahooHistoricalCandlesResponse(data);
  } catch (err) {
    logger.error(`Failed to fetch Yahoo historical OHLCV for ${cleanSymbol}:`, err);
    // 若網路失敗，退回讀取本地舊資料
    const cachedOhlcv = await getSymbolOhlcv(cleanSymbol);
    if (cachedOhlcv && cachedOhlcv.candles.length > 0) {
      return {
        candles: cachedOhlcv.candles,
        indicators: calculateMuscleBookerIndicators(cachedOhlcv.candles),
      };
    }
    return { candles: [], indicators: [] };
  }

  if (fetchedCandles.length === 0) {
    return { candles: [], indicators: [] };
  }

  // 3. 增量合併
  let finalCandles = fetchedCandles;
  const existingStore = await getSymbolOhlcv(cleanSymbol);
  if (existingStore && existingStore.candles.length > 0) {
    finalCandles = mergeDailyCandles(existingStore.candles, fetchedCandles);
  }

  // 4. 計算肌肉書僮完整技術指標時序
  const indicators = calculateMuscleBookerIndicators(finalCandles);

  // 5. 異步沉澱至 IndexedDB
  try {
    await saveSymbolOhlcv({
      symbol: cleanSymbol,
      market,
      candles: finalCandles,
      updatedAt: Date.now(),
    });

    await saveSymbolIndicators({
      symbol: cleanSymbol,
      market,
      points: indicators,
      updatedAt: Date.now(),
    });
  } catch (saveErr) {
    logger.warn(`Failed to persist OHLCV/Indicators to IndexedDB for ${cleanSymbol}:`, saveErr);
  }

  return { candles: finalCandles, indicators };
}

/**
 * 批次回補整體投資組合標的
 */
export async function backfillPortfolioSymbols(
  symbols: Array<{ symbol: string; market: MarketType }>,
  onProgress?: (current: number, total: number, symbol: string) => void
): Promise<void> {
  const total = symbols.length;
  for (let i = 0; i < total; i++) {
    const item = symbols[i];
    if (onProgress) {
      onProgress(i + 1, total, item.symbol);
    }
    try {
      await backfillSymbolOhlcvAndIndicators(item.symbol, item.market);
    } catch (err) {
      logger.warn(`Backfill portfolio failed for ${item.symbol}:`, err);
    }
  }
}
