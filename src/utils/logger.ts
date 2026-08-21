/**
 * 統一前端日誌記錄工具
 * 集中管理錯誤與偵錯資訊，具備生產環境防禦與一致格式
 */

const isDev = typeof window !== 'undefined' ? Boolean((import.meta as any)?.env?.DEV ?? true) : true;

export const logger = {
  error: (message: string, error?: unknown) => {
    if (typeof console !== 'undefined') {
      console.error(`[StockTracker Error] ${message}`, error ?? '');
    }
  },
  warn: (message: string, data?: unknown) => {
    if (isDev && typeof console !== 'undefined') {
      console.warn(`[StockTracker Warn] ${message}`, data ?? '');
    }
  },
  info: (message: string, data?: unknown) => {
    if (isDev && typeof console !== 'undefined') {
      console.info(`[StockTracker Info] ${message}`, data ?? '');
    }
  },
};
