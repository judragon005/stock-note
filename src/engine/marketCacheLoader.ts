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
