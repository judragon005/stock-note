import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketType, PriceQuote, HoldingPosition, ExchangeRateQuote } from '../types/stock';
import { fetchBatchStockQuotes, fetchStockQuote, fetchExchangeRate } from '../engine/priceFetcher';
import {
  loadPriceMetadataFromStorage,
  savePriceMetadataToStorage,
  loadExchangeRateQuote,
  saveExchangeRateQuote,
  getLockedSymbols,
  setSymbolLock as persistSymbolLock,
} from '../utils/storage';
import { logger } from '../utils/logger';

/**
 * 判定台股當前是否處於開盤交易時段 (週一至週五 09:00 ~ 13:30 台北時間)
 */
export function isTaiwanMarketOpen(now: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      hour12: false,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    let weekday = '';
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
      if (part.type === 'second') second = parseInt(part.value, 10);
    }

    // 週末休市
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    const totalSeconds = hour * 3600 + minute * 60 + second;
    const openSeconds = 9 * 3600; // 09:00:00
    const closeSeconds = 13 * 3600 + 30 * 60; // 13:30:00

    return totalSeconds >= openSeconds && totalSeconds <= closeSeconds;
  } catch {
    return false;
  }
}

/**
 * 判定美股當前是否處於開盤交易時段 (美東時間週一至週五 09:30 ~ 16:00)
 */
export function isUSMarketOpen(now: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    let weekday = '';
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
      if (part.type === 'second') second = parseInt(part.value, 10);
    }

    // 週末休市
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    const totalSeconds = hour * 3600 + minute * 60 + second;
    const openSeconds = 9 * 3600 + 30 * 60; // 09:30:00
    const closeSeconds = 16 * 3600; // 16:00:00

    return totalSeconds >= openSeconds && totalSeconds <= closeSeconds;
  } catch {
    return false;
  }
}

/**
 * 判定台股或美股是否有任一市場處於開盤時段
 */
export function isAnyMarketOpen(now: Date = new Date()): boolean {
  return isTaiwanMarketOpen(now) || isUSMarketOpen(now);
}

/**
 * 輪詢調度核心：過濾已鎖定或 0 股標的，發起並行請求
 */
export async function orchestrateBatchRefresh(
  holdings: { symbol: string; market: MarketType; shares: number }[],
  lockedSymbols: string[],
  batchFetcher: typeof fetchBatchStockQuotes = fetchBatchStockQuotes
): Promise<Record<string, PriceQuote>> {
  const lockedSet = new Set(lockedSymbols.map((s) => s.trim().toUpperCase()));

  const targets = holdings
    .filter((h) => h.shares > 0 && !lockedSet.has(h.symbol.trim().toUpperCase()))
    .map((h) => ({ symbol: h.symbol, market: h.market }));

  if (targets.length === 0) {
    return {};
  }

  return await batchFetcher(targets);
}

interface UsePriceAutoRefreshOptions {
  holdings: HoldingPosition[];
  onPricesCalculated?: (newPrices: Record<string, number>) => void;
  onExchangeRateCalculated?: (rate: number, quote: ExchangeRateQuote) => void;
  intervalMs?: number; // 預設 60000 ms (60秒)
}

/**
 * 全市場即時/延遲報價與匯率智慧輪詢 React Hook
 */
export function usePriceAutoRefresh({
  holdings,
  onPricesCalculated,
  onExchangeRateCalculated,
  intervalMs = 60000,
}: UsePriceAutoRefreshOptions) {
  const [quotes, setQuotes] = useState<Record<string, PriceQuote>>(() => {
    const store = loadPriceMetadataFromStorage();
    return store.quotes || {};
  });

  const [exchangeRateQuote, setExchangeRateQuote] = useState<ExchangeRateQuote>(() => {
    return loadExchangeRateQuote();
  });

  const [lockedSymbols, setLockedSymbols] = useState<string[]>(() => {
    return getLockedSymbols();
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => {
    const store = loadPriceMetadataFromStorage();
    return store.lastGlobalUpdate || null;
  });

  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const lockedSymbolsRef = useRef(lockedSymbols);
  lockedSymbolsRef.current = lockedSymbols;

  // 執行全體未鎖定持股與匯率同步刷新
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const activeHoldings = holdingsRef.current.filter((h) => h.shares > 0);

      const [quotesResult, rateResult] = await Promise.allSettled([
        activeHoldings.length > 0
          ? orchestrateBatchRefresh(activeHoldings, lockedSymbolsRef.current, fetchBatchStockQuotes)
          : Promise.resolve<Record<string, PriceQuote>>({}),
        fetchExchangeRate(),
      ]);

      const now = Date.now();
      let latestRateQuote: ExchangeRateQuote | undefined = undefined;

      // 處理匯率更新
      if (rateResult.status === 'fulfilled' && rateResult.value) {
        latestRateQuote = rateResult.value;
        setExchangeRateQuote(latestRateQuote);
        saveExchangeRateQuote(latestRateQuote);
        if (onExchangeRateCalculated) {
          onExchangeRateCalculated(latestRateQuote.rate, latestRateQuote);
        }
      }

      // 處理持股報價更新
      if (quotesResult.status === 'fulfilled') {
        const fetchedQuotes: Record<string, PriceQuote> = quotesResult.value;
        if (Object.keys(fetchedQuotes).length > 0) {
          setQuotes((prev) => {
            const updated = { ...prev, ...fetchedQuotes };
            savePriceMetadataToStorage({
              quotes: updated,
              lockedSymbols: lockedSymbolsRef.current,
              lastGlobalUpdate: now,
              exchangeRateQuote: latestRateQuote,
            });
            return updated;
          });

          if (onPricesCalculated) {
            const priceMap: Record<string, number> = {};
            for (const [symbol, q] of Object.entries(fetchedQuotes)) {
              priceMap[symbol] = q.price;
            }
            onPricesCalculated(priceMap);
          }
        }
      }

      setLastUpdated(now);
    } catch (err) {
      logger.error('Batch refresh prices and exchange rate failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [onPricesCalculated, onExchangeRateCalculated]);

  // 單檔標的強制刷新（即便已鎖定亦可手動刷新單檔）
  const refreshSymbol = useCallback(
    async (symbol: string, market: MarketType): Promise<PriceQuote | null> => {
      setIsRefreshing(true);
      try {
        const quote = await fetchStockQuote(symbol, market);
        if (quote) {
          setQuotes((prev) => {
            const updated = { ...prev, [symbol]: quote };
            savePriceMetadataToStorage({
              quotes: updated,
              lockedSymbols: lockedSymbolsRef.current,
              lastGlobalUpdate: Date.now(),
            });
            return updated;
          });

          if (onPricesCalculated) {
            onPricesCalculated({ [symbol]: quote.price });
          }
          return quote;
        }
      } catch (err) {
        logger.error(`Refresh symbol ${symbol} failed:`, err);
      } finally {
        setIsRefreshing(false);
      }
      return null;
    },
    [onPricesCalculated]
  );

  // 切換單檔標的自訂價格鎖定狀態
  const toggleSymbolLock = useCallback((symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    setLockedSymbols((prev) => {
      const isLocked = prev.some((s) => s.trim().toUpperCase() === cleanSymbol);
      const next = isLocked
        ? prev.filter((s) => s.trim().toUpperCase() !== cleanSymbol)
        : [...prev, cleanSymbol];

      persistSymbolLock(cleanSymbol, !isLocked);
      return next;
    });
  }, []);

  // 進站初始自動抓取
  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 智慧開盤輪詢計時器
  useEffect(() => {
    const checkAndPoll = () => {
      if (isAnyMarketOpen()) {
        refreshAll();
      }
    };

    const timer = setInterval(checkAndPoll, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, refreshAll]);

  const marketStatus = {
    isTWOpen: isTaiwanMarketOpen(),
    isUSOpen: isUSMarketOpen(),
    isAnyOpen: isAnyMarketOpen(),
  };

  return {
    quotes,
    exchangeRateQuote,
    lockedSymbols,
    isRefreshing,
    lastUpdated,
    marketStatus,
    refreshAll,
    refreshSymbol,
    toggleSymbolLock,
  };
}

