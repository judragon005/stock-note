import { useEffect, useState, useCallback, useRef } from 'react';

export interface MarketSyncStatusResponse {
  tw: { latestDate: string | null; anchorDate: string; isStale: boolean };
  us: { latestDate: string | null; anchorDate: string; isStale: boolean };
  isCatchingUp: boolean;
  lastCatchupTime: number;
  timestamp: number;
}

export interface UseMarketCatchupSyncOptions {
  onSyncCompleted?: () => void;
  enabled?: boolean;
}

/**
 * 監聽系統在線與分頁甦醒 (Visibility & Online) 之自適應追趕同步 Hook (Spec 0160)
 */
export function useMarketCatchupSync(options: UseMarketCatchupSyncOptions = {}) {
  const { onSyncCompleted, enabled = true } = options;
  const [syncStatus, setSyncStatus] = useState<MarketSyncStatusResponse | null>(null);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const prevCatchingUpRef = useRef(false);

  const checkStatus = useCallback(async (triggerCatchup = true) => {
    try {
      const url = triggerCatchup ? '/api/market/sync-status?catchup=true' : '/api/market/sync-status';
      const res = await fetch(url);
      if (res.ok) {
        const data: MarketSyncStatusResponse = await res.json();
        setSyncStatus(data);
        setIsCatchingUp(data.isCatchingUp);

        // 若前次正在追趕，本次完成，通知回呼重新載入日 K
        if (prevCatchingUpRef.current && !data.isCatchingUp) {
          if (onSyncCompleted) {
            onSyncCompleted();
          }
        }
        prevCatchingUpRef.current = data.isCatchingUp;
      }
    } catch {
      // 離線或網路失敗時靜默降級
    }
  }, [onSyncCompleted]);

  useEffect(() => {
    if (!enabled) return;

    // 首屏檢查一次
    checkStatus(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus(true);
      }
    };

    const handleOnline = () => {
      checkStatus(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, checkStatus]);

  return {
    syncStatus,
    isCatchingUp,
    checkStatus,
  };
}
