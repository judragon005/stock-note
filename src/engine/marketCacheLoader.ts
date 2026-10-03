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
          compactHistoryPromise = null;
          return null;
        }
        const data: Record<string, RawCompactCandle[]> = await res.json();
        return data;
      } catch (err) {
        logger.warn('載入 tw_market_ohlcv_compact.json 失敗:', err);
        compactHistoryPromise = null;
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

/**
 * 優先從本地 Vite SQLite 數據湖倉載入標的歷史 250 天日 K，並非同步沉澱至 IndexedDB；
 * 若本地 API 不可用或處於離線環境，平滑降級為 Compact JSON 或已沉澱快取。
 */
export async function loadSymbolHistoryFromLakehouse(
  symbol: string,
  market: MarketType = 'TW'
): Promise<DailyCandle[] | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  // 1. 優先嘗試請求本地 SQLite API
  try {
    const res = await fetch(`/api/market/history/${encodeURIComponent(cleanSym)}?limit=250`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.candles) && data.candles.length > 0) {
        const candles: DailyCandle[] = data.candles.map((c: any) => ({
          date: c.date,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));

        // 非同步沉澱至 IndexedDB
        saveSymbolOhlcv({
          symbol: cleanSym,
          market,
          candles,
          updatedAt: Date.now(),
        }).catch((err) => {
          logger.warn(`[marketCacheLoader] IndexedDB 沉澱失敗 (${cleanSym}):`, err);
        });

        return candles;
      }
    }
  } catch (err) {
    // 忽略網路錯誤，準備平滑降級
  }

  // 2. 降級策略：台股標的嘗試使用既有 compact 快取
  if (market === 'TW') {
    try {
      const compactCandles = await loadSymbolCompactHistory(cleanSym);
      if (compactCandles && compactCandles.length > 0) {
        return compactCandles;
      }
    } catch (err) {
      // 忽略
    }
  }

  return null;
}

export interface LakehouseFullPayload {
  candles: DailyCandle[];
  institutionalRecords?: Array<{
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
    marginBalance?: number;
    shortBalance?: number;
    dayTradeRate?: number;
  }>;
  marginBalance?: number;
  shortBalance?: number;
  dayTradeRate?: number;
  tdccRecords?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>;
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
}

/**
 * 從本地 SQLite 湖倉同時載入標的歷史日 K、三大法人籌碼、集保大戶與月營收 (Spec 0164)
 */
export async function loadSymbolFullLakehouseData(
  symbol: string,
  market: MarketType = 'TW'
): Promise<LakehouseFullPayload | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  try {
    const res = await fetch(`/api/market/history/${encodeURIComponent(cleanSym)}?limit=250`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.candles) && data.candles.length > 0) {
        const candles: DailyCandle[] = data.candles.map((c: any) => ({
          date: c.date,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));

        saveSymbolOhlcv({
          symbol: cleanSym,
          market,
          candles,
          updatedAt: Date.now(),
        }).catch((err) => {
          logger.warn(`[marketCacheLoader] IndexedDB 沉澱失敗 (${cleanSym}):`, err);
        });

        let institutionalRecords: LakehouseFullPayload['institutionalRecords'] = undefined;
        if (data.chips && typeof data.chips === 'object') {
          const chipRows = Object.values(data.chips) as any[];
          if (chipRows.length > 0) {
            institutionalRecords = chipRows.map((r: any) => ({
              date: r.date,
              foreignShares: Number(r.foreign_net) || 0,
              trustShares: Number(r.trust_net) || 0,
              dealerShares: Number(r.dealer_net) || 0,
              marginBalance: r.margin_balance != null ? Number(r.margin_balance) : undefined,
              shortBalance: r.short_balance != null ? Number(r.short_balance) : undefined,
              dayTradeRate: r.day_trade_rate != null ? Number(r.day_trade_rate) : undefined,
            }));
          }
        }

        let tdccRecords: LakehouseFullPayload['tdccRecords'] = undefined;
        if (Array.isArray(data.tdcc) && data.tdcc.length > 0) {
          tdccRecords = data.tdcc.map((r: any) => ({
            date: r.date,
            totalShareholders: r.total_shareholders != null ? Number(r.total_shareholders) : undefined,
            over400Ratio: r.over_400_ratio != null ? Number(r.over_400_ratio) : undefined,
            over1000Ratio: r.over_1000_ratio != null ? Number(r.over_1000_ratio) : undefined,
            under10Ratio: r.under_10_ratio != null ? Number(r.under_10_ratio) : undefined,
          }));
        }

        let revenueRecords: LakehouseFullPayload['revenueRecords'] = undefined;
        if (Array.isArray(data.revenue) && data.revenue.length > 0) {
          revenueRecords = data.revenue.map((r: any) => ({
            yearMonth: r.year_month,
            revenue: Number(r.revenue) || 0,
            lastYearRevenue: r.last_year_revenue != null ? Number(r.last_year_revenue) : undefined,
            yoyRate: r.yoy_rate != null ? Number(r.yoy_rate) : undefined,
            momRate: r.mom_rate != null ? Number(r.mom_rate) : undefined,
            isAllTimeHigh: r.is_all_time_high != null ? Number(r.is_all_time_high) : 0,
          }));
        }

        const latestChipRow =
          institutionalRecords && institutionalRecords.length > 0
            ? institutionalRecords[institutionalRecords.length - 1]
            : undefined;

        return {
          candles,
          institutionalRecords,
          marginBalance: latestChipRow?.marginBalance,
          shortBalance: latestChipRow?.shortBalance,
          dayTradeRate: latestChipRow?.dayTradeRate,
          tdccRecords,
          revenueRecords,
        };
      }
    }
  } catch (err) {
    // 忽略網路錯誤
  }

  return null;
}


/**
 * 載入指定標的之處置與注意狀態 (Ticket 03)
 */
export async function loadSymbolDispositionStatus(
  symbol: string,
  market: MarketType = 'TW'
): Promise<'NORMAL' | 'ATTENTION' | 'DISPOSITION'> {
  if (market !== 'TW' || !symbol) {
    return 'NORMAL';
  }

  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  try {
    const res = await fetch(`/api/market/quote/${encodeURIComponent(cleanSym)}`);
    if (res.ok) {
      const data = await res.json();
      const status = data?.meta?.status;
      if (status === 'DISPOSITION' || status === 'ATTENTION') {
        return status;
      }
    }
  } catch (err) {
    // 網路異常或伺服器無回應時，安全回退 NORMAL
  }

  return 'NORMAL';
}


