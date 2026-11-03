import { useState, useEffect, useRef, useCallback } from 'react';
import { DailyCandle } from '../../../types/indicators';
import { MarketType } from '../../../types/stock';
import { AssetPoolType } from '../../../engine/muscleBookerEngine';
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

interface SyncWorkerParams {
  items: Array<{ symbol: string; market: MarketType }>;
  forceRefresh: boolean;
  concurrency?: number;
  isCancelled?: () => boolean;
  isMounted: () => boolean;
  onProgress: (completed: number, currentSymbol: string) => void;
  onUpdateCandles: (symbol: string, candles: DailyCandle[]) => void;
}

/**
 * 共用並發批次同步排程器 (消滅重複代碼與 Shotgun Surgery 隱患)
 */
async function processSyncBatch({
  items,
  forceRefresh,
  concurrency = 3,
  isCancelled = () => false,
  isMounted,
  onProgress,
  onUpdateCandles,
}: SyncWorkerParams) {
  let completed = 0;
  let index = 0;
  const total = items.length;
  const actualConcurrency = Math.min(concurrency, total);

  const worker = async () => {
    while (index < total) {
      if (isCancelled() || !isMounted()) return;
      const currentIndex = index++;
      const m = items[currentIndex];

      if (!isCancelled() && isMounted()) {
        onProgress(completed, m.symbol);
      }

      try {
        const res = await backfillSymbolOhlcvAndIndicators(m.symbol, m.market, forceRefresh);
        if (isCancelled() || !isMounted()) return;
        if (res.candles && res.candles.length >= 5) {
          onUpdateCandles(m.symbol, res.candles);
        }
      } catch {
        // 零幻覺原則：外部行情連線失敗或缺損標的維持 isDataPending，絕不偽造假 K 線
        if (isCancelled() || !isMounted()) return;
      }

      completed++;
      if (!isCancelled() && isMounted()) {
        onProgress(completed, m.symbol);
      }

      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  };

  const workers = Array.from({ length: actualConcurrency }, () => worker());
  await Promise.all(workers);
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

  // 1.1 從 IndexedDB 批次水合並對缺損標的進行受控增量回補 (分塊 100 檢索)
  useEffect(() => {
    let isCancelled = false;

    const syncCandles = async () => {
      try {
        // 找出尚未快取的項目
        const toFetch = targetUniverse.filter((item) => !cachedCandlesMap[item.symbol]);
        if (toFetch.length === 0) return;

        const initialUpdates: Record<string, DailyCandle[]> = {};
        const missing: { symbol: string; market: MarketType }[] = [];

        // 第一步：分塊檢索 IndexedDB 本地快取 (Chunk 100)，避免資料庫線程過載
        const CHUNK_SIZE = 100;
        const idbResults: Array<{ item: TargetUniverseItem; cached: any }> = [];
        for (let i = 0; i < toFetch.length; i += CHUNK_SIZE) {
          if (isCancelled || !isMountedRef.current) return;
          const chunk = toFetch.slice(i, i + CHUNK_SIZE);
          const chunkResults = await Promise.all(
            chunk.map(async (item) => {
              try {
                const cached = await getSymbolOhlcv(item.symbol);
                return { item, cached };
              } catch {
                return { item, cached: null };
              }
            })
          );
          idbResults.push(...chunkResults);
        }

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

          await processSyncBatch({
            items: missing,
            forceRefresh: false,
            concurrency: 3,
            isCancelled: () => isCancelled,
            isMounted: () => isMountedRef.current,
            onProgress: (comp, sym) => {
              setSyncState((prev) => ({ ...prev, current: comp, currentSymbol: sym }));
            },
            onUpdateCandles: queueCandleUpdate,
          });

          // 結束前強制清空緩衝區
          flushBuffer();
        }
      } finally {
        if (!isCancelled && isMountedRef.current) {
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            currentSymbol: undefined,
          }));
        }
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

  // 手動觸發全池增量同步最新收盤 (try ... finally 杜絕死鎖)
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

      try {
        await processSyncBatch({
          items,
          forceRefresh,
          concurrency: 3,
          isMounted: () => isMountedRef.current,
          onProgress: (comp, sym) => {
            setSyncState((prev) => ({ ...prev, current: comp, currentSymbol: sym }));
          },
          onUpdateCandles: queueCandleUpdate,
        });

        flushBuffer();
      } finally {
        if (isMountedRef.current) {
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            currentSymbol: undefined,
          }));
        }
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
