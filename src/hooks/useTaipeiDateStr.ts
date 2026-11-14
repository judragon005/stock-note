import { useEffect, useState } from 'react';
import { getTaipeiDateStr } from '../utils/formatters';

export interface TaipeiDateSyncController {
  getCurrentDate: () => string;
  start: () => () => void;
}

/**
 * 純 JS 跨午夜日期同步控制器 (便於在無 DOM 測試環境下驗證定時與焦點觸發行為)
 */
export function createTaipeiDateSyncController(
  onDateChange: (nextDate: string) => void,
  intervalMs: number = 60_000
): TaipeiDateSyncController {
  let current = getTaipeiDateStr();

  const sync = () => {
    const next = getTaipeiDateStr();
    if (next !== current) {
      current = next;
      onDateChange(next);
    }
  };

  return {
    getCurrentDate: () => current,
    start: () => {
      const timer = globalThis.setInterval(sync, intervalMs);
      const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
      if (hasWindow) {
        window.addEventListener('focus', sync);
      }
      return () => {
        globalThis.clearInterval(timer);
        if (hasWindow) {
          window.removeEventListener('focus', sync);
        }
      };
    },
  };
}

/**
 * React Hook: 取得台北當地日期 (YYYY-MM-DD) 並在跨午夜或視窗重新聚焦時自動刷新
 */
export function useTaipeiDateStr(): string {
  const [todayStr, setTodayStr] = useState<string>(() => getTaipeiDateStr());

  useEffect(() => {
    const controller = createTaipeiDateSyncController((next) => {
      setTodayStr((prev) => (prev === next ? prev : next));
    });
    const initial = controller.getCurrentDate();
    setTodayStr((prev) => (prev === initial ? prev : initial));
    return controller.start();
  }, []);

  return todayStr;
}
