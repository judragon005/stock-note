# 11 — 前端 marketCacheLoader 接入本地 API 與離線降級 (Client Cache Loader & Hydration)

**What to build:**
重構 `src/engine/marketCacheLoader.ts`。
新增 `loadSymbolHistoryFromLakehouse(symbol: string, market: MarketType): Promise<DailyCandle[] | null>`。
載入策略：
1. 優先透過 `fetch('/api/market/history/' + symbol)` 向 Vite 本地 SQLite 中介層請求 250 天歷史數據。
2. 成功取得後，非同步寫入瀏覽器 IndexedDB (`saveSymbolOhlcv`) 實現本地沉澱。
3. 若處於離線環境、無網路或 Vite 中介層不可用時（如靜態部署），自動平滑降級為 IndexedDB 或既有之 `loadSymbolCompactHistory`，確保 100% 不拋出致命異常。

**Blocked by:** 10 — Vite 原生 Connect 中介層 API

**Status:** ready-for-agent

- [ ] `loadSymbolHistoryFromLakehouse` 成功從 `/api/market/history/:symbol` 取得日 K。
- [ ] 自動將取得之日 K 寫入 IndexedDB。
- [ ] 模擬 API 網路中斷時，能無縫降級回 IndexedDB 與既有本地快取。
- [ ] 支援美股標的 (market='US') 正確格式化為標準 `DailyCandle`。
- [ ] 單元測試 `src/engine/marketCacheLoader.test.ts` 驗證本地 API 優先與平滑降級邏輯 100% 通過。
