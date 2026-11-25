# ADR 0248: 系統免疫強化 Wave 1 — SQLite 高頻表日期索引、持久化單一排程帳本與三軌水位線防禦

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-25
- **關聯規格與 Issue**: [Spec 0248](../specs/0248-lakehouse-index-scheduler-ledger-and-watermark-guard-spec.md) / GitHub Issue `#611`

## 背景 (Context)

Spec 0246 雙軸審查與 Spec 0247 五路正交法醫審計揭露湖倉查詢與 NAS 24/7 自治排程存在兩組待清償技術債（[Debt 0065](../debts/0065-nas-scheduler-retry-ledger-and-decomposition.md)、[Debt 0066](../debts/0066-sqlite-date-indexes-and-scheduler-watermark-poisoning.md)）：

1. `tw_tdcc_distribution`、`tw_monthly_revenue`、`tw_valuation_daily`、`etf_daily_nav` 僅具備 `(symbol, date/year_month)` 複合索引，導致每次 `/healthz`、`/api/market/sync-status` 與宏觀擴散查詢反覆執行全表 `SCAN`。
2. `lakehouse-sync-coordinator.cjs`（`laneRetryState`）與 `nas-autonomous-scheduler.cjs`（`lastRunState.lanes`）雙重維護記憶體重試計數並依賴手動回扣；Docker 容器 OOM 重啟時帳本歸零恐引發啟動暴衝迴圈；排程器單體函式（`runTickNow` ~248 行、`evaluateScheduleWindow` ~109 行）圈複雜度過高。
3. 排程三條軌道存在「假性成功水位線毒化」：Macro 軌以 UTC 定錨日期且全網斷線仍寫入全 `NULL` 列回傳 `true`；Weekly 軌子任務內部吞錯回傳 `{ savedCount: 0 }` 仍推進水位線與觸發備份；US Daily 軌 1,500+ 檔僅成功 1 檔即判定 `ok: true` 推進水位線。
4. `audit-verifier.cjs` 硬編碼過期 2026 休市日曆而非引用 `trading-calendar-engine.cjs`；`ingest-tw-quotes.cjs` 未接入共享 `isTwOtcWarrantSymbol` 權證濾除規則。

## 決策 (Decision)

1. **SQLite Date-First Index Convergence**：
   - 於 `scripts/market-sync/sqlite-db-core.cjs` 以冪等 `CREATE INDEX IF NOT EXISTS` 補齊 4 支日期／年月首欄索引：`idx_tdcc_date`、`idx_revenue_ym`、`idx_valuation_date`、`idx_etf_nav_date`。
   - 保留 `tw_institutional_chips` 既有 `idx_chips_date(date)`，避免額外寫入放大。
2. **Persistent Scheduler Lane Ledger SSOT & Decomposition（延伸 ADR 0246）**：
   - 於 `sqlite-db-core.cjs` 新增單一持久化表 `scheduler_lane_state`（PK: `lane_key`，支援 `twDaily`、`twPhase1`、`usDaily`、`macro`、`weekly`），持久化 `watermark_date`、`last_run_iso_date`、`retry_count`、`last_attempt_at`、`status`、`phase`、`last_error`、`updated_at`。
   - 由 `lakehouse-sync-coordinator.cjs` 作為唯一讀寫 SSOT（依 `customDbPath` 隔離，無 SQLite 環境優雅降級至記憶體），`nas-autonomous-scheduler.cjs` 全面改採唯讀查詢並拔除手動 `retryCount - 1` 回扣，同時將視窗決策與巡檢執行拆解為四條獨立分軌輔助函式，100% 維持既有公開介面與 `handlers.runDailySync` 相容性。
3. **Tri-Lane Watermark Poisoning Guard**：
   - **Macro 軌**：`fetchMacroSentimentDaily` 預設日期改採 `Asia/Taipei`；`ingestMacroSentimentToDb` 驗證 21 項數值欄位至少 1 項為有限數值 (`Number.isFinite`) 始寫入並回傳 `true`，全空列拒絕寫入並回傳 `false`。
   - **Weekly 軌**：`weekly-lakehouse-sync.cjs` 統一檢核 5 項子任務，任何回傳 `ok === false`、`success === false`、`error` 非空，或 `savedCount === 0` 且未顯式標記 `cached`/`skipped`/`upToDate` 者皆判定失敗，整份報告 `ok: false` 禁止推進水位線與備份。
   - **US Daily 軌**：於 `sync-thresholds.cjs` 新增 `US_DAILY_MIN_SUCCESS_RATIO = 0.8`，`sync-us-market.cjs` 與排程器一致要求 `totalTargets > 0` 且 `(successCount + skippedCount) / totalTargets >= 0.8` 始允許推進水位線。
4. **Calendar & Warrant Rule SSOT Convergence**：
   - `audit-verifier.cjs` 移除硬編碼 `HOLIDAYS_TW_2026` / `HOLIDAYS_US_2026`，委派至 `trading-calendar-engine.cjs` `isTradingDay`。
   - `ingest-tw-quotes.cjs` 保留既有匯出簽章，於 `parseTpexDailyQuotes` 與 `saveTwQuotesToSqlite` 接入共享 `isTwOtcWarrantSymbol` 濾除櫃買權證。

## 後果 (Consequences)

- **正向效益**：零新增外部依賴；`/healthz` 與 `/api/market/sync-status` 達成零全表 `SCAN`；容器重啟不遺失水位線與配額、徹底消除雙重帳本與手動回扣；Macro／Weekly／US 三軌假性成功水位線毒化歸零；審計日曆與櫃買權證過濾全面回歸單一事實來源。
- **權衡**：新增 4 支次級索引與 1 張極輕量 5 列狀態表會帶來微幅磁碟空間增量（相對於湖倉整體 $< 3\%$）；Weekly 子任務若在無新資料時希望視為合法冪等成功，須顯式回傳 `cached: true`、`skipped: true` 或 `upToDate: true` 旗標。
