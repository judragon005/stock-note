# Ticket 03: Vite Connect 中介層全自動背景追趕與冷卻鎖自癒 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：`scripts/market-sync/vite-market-middleware.cjs`
* **測試檔案**：`src/engine/viteMarketMiddleware.test.ts`

## 2. 需求描述 (Description)
1. 整合背景追趕任務：
   * 擴展 `triggerCatchupTask(customDbPath)`，在執行完日 K 買賣超後，依序調用 `runTdccIngestion` 與 `runMonthlyRevenueIngestion`。
   * 以 `try-catch` 包裹各獨立模組，任一任務異常不阻礙其他任務執行。
2. 擴展中介層陳舊度判定：
   * 伺服器啟動巡檢與 `/api/market/sync-status` 路由，將判定條件擴充為 `freshness.tw.isStale || freshness.us.isStale || freshness.tdcc?.isStale || freshness.revenue?.isStale`。
   * `/api/market/sync-status` 回傳內容同步包含 `tdcc` 與 `revenue` 的狀態結構。
3. 嚴格冷卻保護：
   * 確保每次追趕均受 `CATCHUP_COOLDOWN_MS` (10 分鐘) 冷卻保護，杜絕高頻重複並行。

## 3. 測試縫隙 (Test Seams)
* 透過 Connect 中介層公開模擬 HTTP 請求驗證狀態輸出與冷卻攔截行為。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0177 之 **AC 3, AC 4**。
* [ ] `src/engine/viteMarketMiddleware.test.ts` 測試 100% 綠燈。
