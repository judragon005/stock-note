# 02 — 日 K 湖倉查詢 API 與前端 Loader 穿透

**What to build:** 升級 `/api/market/history/:symbol?limit=250` API 端點與前端 `loadSymbolFullLakehouseData` / `loadSymbolHistoryFromLakehouse`，確保前端查詢台股（如 2330、0050）時能 100% 讀取 `>= 250` 根真實日 K，查詢延遲 < 10ms。

**Blocked by:** 01 — 台股 2,361 檔歷史 CSV 250+ 交易日日 K 批次入庫模組

**Status:** done

- [x] 驗證 `/api/market/history/:symbol` 預設 limit 支援 250 筆
- [x] 確保 `marketCacheLoader.ts` 正確解析 250 根日 K 並非同步沉澱至 IndexedDB
- [x] 撰寫測試驗證 250 筆日 K 的檢索時間與資料完整性
