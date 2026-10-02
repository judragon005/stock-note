# Ticket 02: 實裝 Vite 中介層啟動過期檢查與非同步自動追趕同步器 (/api/market/sync-status)

## 目標
在 `scripts/market-sync/vite-market-middleware.cjs` 實作：
1. `GET /api/market/sync-status` 端點，回傳台股與美股的最新日 K 日期、結算狀態與是否正在追趕中。
2. 啟動非同步追趕巡檢：若 `daily_candles` 中最新日期落後當前市場結算交易日，自動觸發背景追趕同步。
