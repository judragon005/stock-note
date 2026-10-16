# Issue #268: 歷史回補端到端全生命週期超時、單日看門狗與任務取消重設控制 (Spec 0187)

- **GitHub Issue**: [#268](https://github.com/judragon005/stock-note/issues/268)
- **規格文件**: [docs/specs/0187-backfill-timeout-watchdog-and-cancellation-control-spec.md](../../../docs/specs/0187-backfill-timeout-watchdog-and-cancellation-control-spec.md)
- **架構決策**: [docs/adr/0187-backfill-timeout-watchdog-and-cancellation-control.md](../../../docs/adr/0187-backfill-timeout-watchdog-and-cancellation-control.md)
- **狀態**: `OPEN` (Triage 完成，`ready-for-agent`)

---

## 任務工單拆解 (Tickets Breakdown)

### [Ticket 01] 傳輸層加固：`defaultFetchJson` 升級原生 `fetch` 與 `AbortSignal.timeout`
- **目標檔案**: `scripts/market-sync/backfill-tw-history-web.cjs`, `scripts/market-sync/sync-tw-market.cjs`
- **改動重點**:
  - 捨棄舊有 `http.get` / `https.get` 容易導致串流掛起之實作。
  - 統一採用 Node.js 18+ 原生 `fetch` 搭配 `AbortSignal.timeout(20000)`，保證 DNS、握手、Header 到 Body 讀取串流具備 20 秒硬性超時。
  - 正確解析 JSON 與處理空字串容錯。
- **驗收標準**: 當伺服器回應掛起時，20 秒內必須強制中斷並拋出 `TimeoutError`，外層 `retryFetch` 能正確捕捉進行退避重試。

### [Ticket 02] 守護層加固：單日執行看門狗 (Per-Date Watchdog Circuit Breaker)
- **目標檔案**: `scripts/market-sync/backfill-tw-history-web.cjs`
- **改動重點**:
  - 在 `runTwDateDrivenBackfill` 主迴圈中為單日 `fetchAndIngestTwDailyData` 加上 `Promise.race` 看門狗（上限 45 秒）。
  - 當捕獲逾時錯誤時，印出 `⚠️ 逾時: 單日處理超時 (已推入補漏清單並跳過)`，記錄至 `failedDates`。
- **驗收標準**: 單日執行若超過 45 秒，主迴圈絕不死鎖，自動跳過該日並安全前進至下一交易日。

### [Ticket 03] 控制層 API：後端取消任務與強制重設狀態端點
- **目標檔案**: `scripts/market-sync/backfill-full-market-history.cjs`, `scripts/market-sync/vite-market-middleware.cjs`
- **改動重點**:
  - 引入全域 `activeAbortController = new AbortController()` 關聯進行中之回補任務。
  - 新增 `cancelBackfillTask()` 與 `resetBackfillGlobalStatus()`。
  - Vite 中介層註冊 `POST /api/market/backfill-cancel` 與 `POST /api/market/backfill-reset`。
- **驗收標準**: 呼叫取消或重設端點後，`backfillGlobalStatus.isRunning` 在 100ms 內安全轉為 `false`，中止關聯的非同步排程。

### [Ticket 04] UI/UX 觀測加固：前端排程中心狀態遲滯警示與控制按鈕
- **目標檔案**: `src/components/MarketScheduleHubSection.tsx`
- **改動重點**:
  - 若 `backfillStatus?.isRunning === true` 且 `updatedAt` 超過 60 秒未更新，提示「⚠️ 回補進度可能遲滯」。
  - 在面板提供「強制停止 / 重置」控制按鈕，呼叫 `POST /api/market/backfill-cancel`。
- **驗收標準**: 使用者可在 UI 上直接一鍵停止與重設卡死之背景任務。

### [Ticket 05] 測試驗證與回歸閉環 (TDD)
- **目標檔案**: `src/engine/backfillFullMarketHistory.test.ts`, `scripts/market-sync/backfill-tw-history-web.test.cjs`
- **改動重點**:
  - 編寫單元測試覆蓋 `defaultFetchJson` 逾時邏輯、單日看門狗熔斷邏輯與取消 API。
  - 執行 `npm test` 與 `npm run build` 確認 100% 通過。
