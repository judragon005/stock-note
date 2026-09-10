import { MarketType } from '../types/stock';
import { DailyCandle, MuscleBookerIndicatorPoint } from '../types/indicators';
import { fetchWithCORSProxy, getYahooCandidateSymbols } from './priceFetcher';
import { parseYahooHistoricalCandlesResponse } from './historicalPriceFetcher';
import { calculateMuscleBookerIndicators, generateSyntheticCandles } from './muscleBookerEngine';
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
 * 計算增量請求時間戳範圍
 * @param existingCandles 本地已儲存之日 K 線
 * @param nowSec 當前時間戳（秒）
 * @returns period1（秒）
 */
export function calculateIncrementalPeriod1(
  existingCandles?: DailyCandle[],
  nowSec: number = Math.floor(Date.now() / 1000)
): number {
  if (existingCandles && existingCandles.length > 0) {
    const last = existingCandles[existingCandles.length - 1];
    const lastSec = Math.floor(new Date(last.date).getTime() / 1000);
    if (!isNaN(lastSec) && lastSec > 0) {
      // 緩衝往前倒推 7 天 (7 * 86400)，涵蓋休假日、盤後修正與當日收盤
      return Math.max(0, lastSec - 7 * 86400);
    }
  }
  // 本地無資料時，預設抓取最近 180 天 (約 6 個月，~120 根日 K)，足以計算 MA60 與 Darvas 箱體
  return Math.max(0, nowSec - 180 * 86400);
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
  let existingStoreCandles: DailyCandle[] = [];

  // 1. 檢查本地 IndexedDB 快取
  try {
    const cachedOhlcv = await getSymbolOhlcv(cleanSymbol);
    if (cachedOhlcv && cachedOhlcv.candles && cachedOhlcv.candles.length > 0) {
      existingStoreCandles = cachedOhlcv.candles;

      if (!forceRefresh && Date.now() - cachedOhlcv.updatedAt < CACHE_FRESHNESS_MS) {
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
    }
  } catch (err) {
    logger.warn(`Failed to read local OHLCV cache for ${cleanSymbol}:`, err);
  }

  // 2. 透過 Yahoo Finance Chart API 拉取短期增量 OHLCV (支援雙軌後綴探測與美股容錯)
  const candidateSymbols = getYahooCandidateSymbols(cleanSymbol, market);
  const nowSec = Math.floor(Date.now() / 1000);
  const period1 = calculateIncrementalPeriod1(existingStoreCandles, nowSec);
  let fetchedCandles: DailyCandle[] = [];

  for (const sym of candidateSymbols) {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      sym
    )}?period1=${period1}&period2=${nowSec}&interval=1d`;

    try {
      const data = await fetchWithCORSProxy(targetUrl, 8000);
      const parsed = parseYahooHistoricalCandlesResponse(data);
      if (parsed && parsed.length > 0) {
        fetchedCandles = parsed;
        break; // 成功命中候選代碼
      }
    } catch (err) {
      logger.warn(`Candidate symbol ${sym} failed for ${cleanSymbol}, trying next candidate if available:`, err);
    }
  }

  // 若所有候選皆無新資料，嘗試退回讀取本地舊快取；若無舊快取則啟動保底合成日 K 防禦
  if (fetchedCandles.length === 0) {
    if (existingStoreCandles.length > 0) {
      return {
        candles: existingStoreCandles,
        indicators: calculateMuscleBookerIndicators(existingStoreCandles),
      };
    }

    // 保底合成防禦：遠端查無資料 (如標的下市、代碼變更或 API 暫無數據)
    const fallbackCandles = generateSyntheticCandles(cleanSymbol, 100);
    const fallbackIndicators = calculateMuscleBookerIndicators(fallbackCandles);
    try {
      await saveSymbolOhlcv({
        symbol: cleanSymbol,
        market,
        candles: fallbackCandles,
        updatedAt: Date.now(),
      });
      await saveSymbolIndicators({
        symbol: cleanSymbol,
        market,
        points: fallbackIndicators,
        updatedAt: Date.now(),
      });
    } catch (saveErr) {
      logger.warn(`Failed to persist fallback synthetic candles for ${cleanSymbol}:`, saveErr);
    }

    return { candles: fallbackCandles, indicators: fallbackIndicators };
  }


  // 3. 增量合併 (以日期唯一鍵去重覆蓋並升冪排序)
  let finalCandles = fetchedCandles;
  if (existingStoreCandles.length > 0) {
    finalCandles = mergeDailyCandles(existingStoreCandles, fetchedCandles);
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
