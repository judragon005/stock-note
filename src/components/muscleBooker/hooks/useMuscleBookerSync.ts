import { useState, useEffect, useRef, useCallback } from 'react';
import { DailyCandle } from '../../../types/indicators';
import { MarketType } from '../../../types/stock';
import { AssetPoolType, generateSyntheticCandles } from '../../../engine/muscleBookerEngine';
import { backfillSymbolOhlcvAndIndicators } from '../../../engine/historicalOhlcvBackfill';
import { getSymbolOhlcv } from '../../../utils/db';

export interface TargetUniverseItem {
  symbol: string;
  name: string;
  market: MarketType;
  basePrice?: number;
}

export interface SyncState {
  isSyncing: boolean;
  total: number;
  current: number;
  currentSymbol?: string;
}

export interface UseMuscleBookerSyncProps {
  targetUniverse: TargetUniverseItem[];
  targetUniverseKey: string;
  selectedPool: AssetPoolType;
}

export function useMuscleBookerSync({
  targetUniverse,
  targetUniverseKey,
  selectedPool,
}: UseMuscleBookerSyncProps) {
  const [cachedCandlesMap, setCachedCandlesMap] = useState<Record<string, DailyCandle[]>>({});
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    total: 0,
    current: 0,
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 批次節流緩衝區 (Batched State Throttling)
  const pendingBufferRef = useRef<Record<string, DailyCandle[]>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBuffer = useCallback(() => {
    if (!isMountedRef.current) return;
    const batch = { ...pendingBufferRef.current };
    const keys = Object.keys(batch);
    if (keys.length > 0) {
      pendingBufferRef.current = {};
      setCachedCandlesMap((prev) => ({ ...prev, ...batch }));
    }
  }, []);

  const queueCandleUpdate = useCallback(
    (symbol: string, candles: DailyCandle[]) => {
      pendingBufferRef.current[symbol] = candles;
      const count = Object.keys(pendingBufferRef.current).length;

      // 當緩衝達到 5 檔以上，立即同步刷新；否則 300ms 節流延遲刷新
      if (count >= 5) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushBuffer();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBuffer();
        }, 300);
      }
    },
    [flushBuffer]
  );

  // 1.1 從 IndexedDB 批次水合並對缺損標的進行受控增量回補
  useEffect(() => {
    let isCancelled = false;

    const syncCandles = async () => {
      // 找出尚未快取的項目
      const toFetch = targetUniverse.filter((item) => !cachedCandlesMap[item.symbol]);
      if (toFetch.length === 0) return;

      const initialUpdates: Record<string, DailyCandle[]> = {};
      const missing: { symbol: string; market: MarketType }[] = [];

      // 第一步：Promise.all 瞬時批次檢索 IndexedDB 本地快取
      const idbResults = await Promise.all(
        toFetch.map(async (item) => {
          try {
            const cached = await getSymbolOhlcv(item.symbol);
            return { item, cached };
          } catch {
            return { item, cached: null };
          }
        })
      );

      for (const { item, cached } of idbResults) {
        if (cached && cached.candles && cached.candles.length >= 5) {
          initialUpdates[item.symbol] = cached.candles;
        } else {
          missing.push({ symbol: item.symbol, market: item.market });
        }
      }

      if (isCancelled || !isMountedRef.current) return;

      if (Object.keys(initialUpdates).length > 0) {
        setCachedCandlesMap((prev) => ({ ...prev, ...initialUpdates }));
      }

      // 第二步：對缺損標的啟動受控並發增量回補 (Concurrency = 3, 節流 60ms)
      if (missing.length > 0) {
        setSyncState({
          isSyncing: true,
          total: missing.length,
          current: 0,
          currentSymbol: missing[0].symbol,
        });

        let completed = 0;
        let index = 0;
        const total = missing.length;
        const concurrency = Math.min(3, total);

        const worker = async () => {
          while (index < total) {
            if (isCancelled || !isMountedRef.current) return;
            const currentIndex = index++;
            const m = missing[currentIndex];

            if (!isCancelled && isMountedRef.current) {
              setSyncState((prev) => ({
                ...prev,
                current: completed,
                currentSymbol: m.symbol,
              }));
            }

            try {
              const res = await backfillSymbolOhlcvAndIndicators(m.symbol, m.market, false);
              if (isCancelled || !isMountedRef.current) return;
              if (res.candles && res.candles.length >= 5) {
                queueCandleUpdate(m.symbol, res.candles);
              } else {
                queueCandleUpdate(m.symbol, generateSyntheticCandles(m.symbol, 100));
              }
            } catch {
              if (isCancelled || !isMountedRef.current) return;
              queueCandleUpdate(m.symbol, generateSyntheticCandles(m.symbol, 100));
            }

            completed++;
            if (!isCancelled && isMountedRef.current) {
              setSyncState((prev) => ({
                ...prev,
                current: completed,
                currentSymbol: m.symbol,
              }));
            }

            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        // 結束前強制清空緩衝區
        flushBuffer();

        if (!isCancelled && isMountedRef.current) {
          setSyncState({
            isSyncing: false,
            total: missing.length,
            current: missing.length,
            currentSymbol: undefined,
          });
        }
      } else {
        setSyncState({
          isSyncing: false,
          total: 0,
          current: 0,
        });
      }
    };

    syncCandles();

    return () => {
      isCancelled = true;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [targetUniverseKey, selectedPool, queueCandleUpdate, flushBuffer]);

  // 手動觸發全池增量同步最新收盤
  const triggerManualSync = useCallback(
    async (forceRefresh = false) => {
      if (syncState.isSyncing) return;
      const items = targetUniverse.map((item) => ({ symbol: item.symbol, market: item.market }));
      if (items.length === 0) return;

      setSyncState({
        isSyncing: true,
        total: items.length,
        current: 0,
        currentSymbol: items[0].symbol,
      });

      let completed = 0;
      let index = 0;
      const total = items.length;
      const concurrency = Math.min(3, total);

      const worker = async () => {
        while (index < total) {
          if (!isMountedRef.current) return;
          const currentIndex = index++;
          const m = items[currentIndex];

          setSyncState((prev) => ({
            ...prev,
            current: completed,
            currentSymbol: m.symbol,
          }));

          try {
            const res = await backfillSymbolOhlcvAndIndicators(m.symbol, m.market, forceRefresh);
            if (!isMountedRef.current) return;
            if (res.candles && res.candles.length >= 5) {
              queueCandleUpdate(m.symbol, res.candles);
            } else {
              queueCandleUpdate(m.symbol, generateSyntheticCandles(m.symbol, 100));
            }
          } catch {
            if (!isMountedRef.current) return;
            queueCandleUpdate(m.symbol, generateSyntheticCandles(m.symbol, 100));
          }

          completed++;
          if (isMountedRef.current) {
            setSyncState((prev) => ({
              ...prev,
              current: completed,
              currentSymbol: m.symbol,
            }));
          }

          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      };

      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);

      flushBuffer();

      if (isMountedRef.current) {
        setSyncState({
          isSyncing: false,
          total: items.length,
          current: items.length,
          currentSymbol: undefined,
        });
      }
    },
    [syncState.isSyncing, targetUniverse, queueCandleUpdate, flushBuffer]
  );

  return {
    cachedCandlesMap,
    setCachedCandlesMap,
    syncState,
    triggerManualSync,
  };
}
