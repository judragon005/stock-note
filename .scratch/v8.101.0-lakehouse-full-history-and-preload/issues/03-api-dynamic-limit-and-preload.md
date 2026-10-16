# 03 — 中介層 API 動態 Limit 查詢與預載視窗對齊 (API Dynamic Limit & Preload Window)

**What to build:**
升級 `scripts/market-sync/vite-market-middleware.cjs` 中 `/api/market/history/:symbol` 端點：
1. 預設維持 `limit = 250`（極速預載視窗，提供戰情室與圖表秒開），確保 MA250 年線運算邊界。
2. 支援 `query.limit` 傳入任意正整數（如 500、1000）或 `all`（不加 LIMIT 子句，全量回傳），支援長天期回測或圖表擴展隨需查詢。
3. 嚴格維持上櫃標的雙向別名防斷層相容性。

**Blocked by:** 01 — 湖倉索引補強與入庫深度解耦 (Storage Depth & Indexing)

**Status:** completed

- [x] `/api/market/history/:symbol` 預設回傳 250 筆
- [x] 傳入 `?limit=500` 回傳 500 筆（或在庫全量）
- [x] 傳入 `?limit=all` 回傳全部在庫日 K
- [x] 撰寫單元測試覆蓋動態 limit 與別名查詢行為 (`src/engine/lakehouseApiDynamicLimit.test.ts` & `src/engine/viteMarketMiddleware.test.ts`)
