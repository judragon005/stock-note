import { useEffect, useState, useCallback, useRef } from 'react';

export const LAKEHOUSE_SYNCED_EVENT = 'stock-tracker:lakehouse-synced';

export interface MarketSyncStatusResponse {
  source?: 'SQLITE_SSOT';
  tw: {
    latestDate: string | null;
    anchorDate: string;
    isStale: boolean;
    chipsCount?: number | null;
    incompleteDates?: string[];
    missingPlanes?: string[];
    symbolCount?: number;
    gapCount?: number;
    gapDates?: string[];
    phase?: string;
    lookbackDays?: number;
  };
  us: {
    latestDate: string | null;
    anchorDate: string;
    isStale: boolean;
    symbolCount?: number;
  };
  tdcc?: { latestDate: string | null; anchorDate: string; isStale: boolean };
  revenue?: { latestMonth: string | null; anchorMonth: string; isStale: boolean };
  macro?: { latestDate: string | null; anchorDate?: string | null; isStale?: boolean };
  weekly?: {
    tdccLatestDate: string | null;
    tdccAnchorDate: string | null;
    tdccIsStale: boolean;
    revenueLatestMonth: string | null;
    revenueAnchorMonth: string | null;
    revenueIsStale: boolean;
  };
  coordinator?: {
    lock: {
      locked: boolean;
      owner: string | null;
      lane: string | null;
      startedAt: number | null;
    };
    retryBudgets?: Record<
      string,
      { isoDate: string | null; retryCount: number; maxRetries: number; lastAttemptAt: number | null }
    >;
  };
  isCatchingUp: boolean;
  lastCatchupTime: number;
  timestamp: number;
}

export interface UseMarketCatchupSyncOptions {
  onSyncCompleted?: () => void;
  enabled?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

/**
 * 判定追趕完成狀態切換純邏輯 (Spec 0166)
 */
export function shouldNotifySyncCompleted(prevIsCatchingUp: boolean, currentIsCatchingUp: boolean): boolean {
  return prevIsCatchingUp && !currentIsCatchingUp;
}

/**
 * 判定背景追趕期間是否應繼續輪詢 (Spec 0246 Ticket 08)
 */
export function shouldContinueCatchupPolling(
  isCatchingUp: boolean,
  pollAttempts: number,
  maxPollAttempts: number = 60
): boolean {
  return Boolean(isCatchingUp) && pollAttempts < maxPollAttempts;
}

/**
 * 單一事實來源：自 SQLite 同步狀態 API (/api/market/sync-status) 抓取最新遙測
 */
export async function fetchMarketSyncStatus(
  fetcher: typeof fetch = fetch
): Promise<MarketSyncStatusResponse | null> {
  try {
    if (typeof fetcher !== 'function') return null;
    const res = await fetcher('/api/market/sync-status');
    if (!res || !res.ok) return null;
    return (await res.json()) as MarketSyncStatusResponse;
  } catch {
    return null;
  }
}

export interface CatchupPollControllerOptions {
  fetcher?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  maxConsecutiveErrors?: number;
  onStatusUpdate?: (status: MarketSyncStatusResponse) => void;
  onSyncCompleted?: () => void;
}

/**
 * 可測試、有上限與瞬斷容錯之背景追趕自動輪詢狀態機 (Spec 0246 Ticket 08)
 */
export function createCatchupPollController(options: CatchupPollControllerOptions = {}) {
  const fetcher = options.fetcher || (typeof fetch === 'function' ? fetch : undefined);
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const maxPollAttempts = options.maxPollAttempts ?? 60;
  const maxConsecutiveErrors = options.maxConsecutiveErrors ?? 3;

  let prevIsCatchingUp = false;
  let pollAttempts = 0;
  let consecutiveErrors = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleNextPoll = () => {
    clearTimer();
    if (disposed) return;
    timer = setTimeout(() => {
      timer = null;
      if (disposed) return;
      pollAttempts += 1;
      void checkStatus(false);
    }, pollIntervalMs);
  };

  const handleTransientFailure = () => {
    consecutiveErrors += 1;
    if (
      prevIsCatchingUp &&
      consecutiveErrors < maxConsecutiveErrors &&
      shouldContinueCatchupPolling(true, pollAttempts, maxPollAttempts)
    ) {
      scheduleNextPoll();
    } else {
      clearTimer();
      prevIsCatchingUp = false;
      pollAttempts = 0;
    }
  };

  const checkStatus = async (triggerCatchup = true): Promise<MarketSyncStatusResponse | null> => {
    if (disposed || typeof fetcher !== 'function') return null;
    try {
      const url = triggerCatchup ? '/api/market/sync-status?catchup=true' : '/api/market/sync-status';
      const res = await fetcher(url);
      if (!res || !res.ok) {
        handleTransientFailure();
        return null;
      }
      const data: MarketSyncStatusResponse = await res.json();
      if (disposed) return null;

      consecutiveErrors = 0;
      options.onStatusUpdate?.(data);

      const finished = shouldNotifySyncCompleted(prevIsCatchingUp, Boolean(data.isCatchingUp));
      prevIsCatchingUp = Boolean(data.isCatchingUp);

      if (finished) {
        clearTimer();
        pollAttempts = 0;
        options.onSyncCompleted?.();
      } else if (shouldContinueCatchupPolling(Boolean(data.isCatchingUp), pollAttempts, maxPollAttempts)) {
        scheduleNextPoll();
      } else {
        clearTimer();
        if (!data.isCatchingUp) {
          pollAttempts = 0;
        }
      }

      return data;
    } catch {
      handleTransientFailure();
      return null;
    }
  };

  return {
    checkStatus,
    dispose: () => {
      disposed = true;
      clearTimer();
    },
  };
}

/**
 * 監聽系統在線與分頁甦醒 (Visibility & Online) 之自適應追趕同步 Hook (Spec 0160 / Spec 0246 Ticket 08)
 */
export function useMarketCatchupSync(options: UseMarketCatchupSyncOptions = {}) {
  const {
    onSyncCompleted,
    enabled = true,
    pollIntervalMs = 5000,
    maxPollAttempts = 60,
  } = options;
  const [syncStatus, setSyncStatus] = useState<MarketSyncStatusResponse | null>(null);
  const [isCatchingUp, setIsCatchingUp] = useState(false);

  const onSyncCompletedRef = useRef(onSyncCompleted);
  onSyncCompletedRef.current = onSyncCompleted;

  const controllerRef = useRef<ReturnType<typeof createCatchupPollController> | null>(null);

  const checkStatus = useCallback(async (triggerCatchup = true) => {
    await controllerRef.current?.checkStatus(triggerCatchup);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const controller = createCatchupPollController({
      pollIntervalMs,
      maxPollAttempts,
      onStatusUpdate: (data) => {
        setSyncStatus(data);
        setIsCatchingUp(Boolean(data.isCatchingUp));
      },
      onSyncCompleted: () => {
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LAKEHOUSE_SYNCED_EVENT));
        }
        onSyncCompletedRef.current?.();
      },
    });
    controllerRef.current = controller;

    // 首屏檢查並觸發 30 日缺口追趕
    void controller.checkStatus(true);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void controller.checkStatus(true);
      }
    };

    const handleOnline = () => {
      void controller.checkStatus(true);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      controller.dispose();
      controllerRef.current = null;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [enabled, pollIntervalMs, maxPollAttempts]);

  return {
    syncStatus,
    isCatchingUp,
    checkStatus,
  };
}
