# 02 — 前端資料管線優先直連 SQLite 本地湖倉 API (Lakehouse-First Hydration in Frontend Pipeline)

**What to build:**
1. 修改 `src/engine/historicalOhlcvBackfill.ts`：
   - 建立四層加載優先序：
     - **Layer 1 (最高優先)**：呼叫 `loadSymbolHistoryFromLakehouse(symbol, market)` 請求 Vite 中介層 `/api/market/history/:symbol?limit=250`。若成功取得（>= 5 根），立即回傳並非同步沉澱至 IndexedDB。
     - **Layer 2**：讀取本地 IndexedDB 快取。
     - **Layer 3**：針對未收錄於湖倉之極罕見標的，嘗試 Yahoo Finance 代理。
     - **Layer 4**：若均查無資料，誠實回傳空陣列 `[]`，絕不偽造假 K 線。
2. 修改 `src/components/aiForceDashboard/AiForceDashboardView.tsx`：
   - 對齊調用鏈，優先經由 SQLite 湖倉獲取標的真實歷史日 K，徹底擺脫對 17.5 MB 之 `tw_market_ohlcv_compact.json` 與外部網路代理的脆弱依賴。
3. 確保輸入台股代碼（如 2886 兆豐金、2330 台積電）能在 0.1 秒內瞬間秒讀日 K 並渲染主 K 線圖。

**Blocked by:** Ticket 01

**Status:** completed

- [x] 於 `historicalOhlcvBackfill.ts` 中將本地 `/api/market/history/:symbol` 設為 Layer 1 最高優先級。
- [x] 整合成功後自動非同步沉澱至 IndexedDB (`saveSymbolOhlcv`)。
- [x] 撰寫單元測試驗證 Layer 1 命中、Layer 2 降級與空資料誠實退避邏輯。
