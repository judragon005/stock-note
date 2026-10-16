# Ticket 03 — 總控引擎與中介層端點自適應回補整合 (`days=auto` & 美股日常增量)

**What to build:**
升級 `scripts/market-sync/backfill-full-market-history.cjs` 與 `scripts/market-sync/vite-market-middleware.cjs`：
1. 支援 `days=auto` 參數（未指定或傳入 `'auto'` 時為預設）。
2. 在 `days=auto` 模式下，總控引擎先調用 `detectTwDateGaps`：
   - 若 `gapDates.length === 0`，日誌回報「本地資料庫已是最新，無需回補」，狀態直接設為 100% 完成，不發起任何多餘網路請求。
   - 若有缺口，將 `datesOverride` 指定為 `gapDates` 傳入 `runTwDateDrivenBackfill`，僅回補缺漏日。
3. 美股軌道連動：當 `days === 'auto' || days <= 20` 時，呼叫 `runUsMarketSync(['--mode=daily'])` 進行日常增量同步，不執行全量 bootstrap；僅在明確指定長天期（如 60/120/250）時才執行 bootstrap。

**Blocked by:**
- Ticket 01 — 台股湖倉水位線與缺口自動探測核心 (`detectTwDateGaps`)
- Ticket 02 — 真·零延遲快取跳過與 ETA 時間權重校準 (Zero-Delay Cache Skip)

**Status:**
closed

**Acceptance criteria:**
- [x] `parseBackfillCliArgs` 與 `triggerBackfillTask` 支援解析 `--days=auto` 或 `days: 'auto'`。
- [x] 中介層 `POST /api/market/backfill-all?days=auto` 正常啟動並回傳任務狀態。
- [x] 在 `auto` 模式且無缺口時，總控任務於 1 秒內標記 completed，日誌清晰。
- [x] 在 `auto` 模式且有缺口時，`totalDays` 設置為缺口天數，進度條計算與 ETA 針對該缺口天數動態更新。
- [x] 美股軌道連動模式判定正確（`auto` 走 `--mode=daily`）。
- [x] 撰寫/擴充 `backfillFullMarketHistory.test.ts` 驗證端點與總控邏輯。
