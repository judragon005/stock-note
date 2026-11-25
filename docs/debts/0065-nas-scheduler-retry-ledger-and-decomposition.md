# Debt 0065: NAS 排程重試帳本單一化與長函式軌道拆解

- **優先級 (Priority)**: `P3`
- **狀態 (Status)**: `RESOLVED`（已於 v9.30.0 · Spec 0248 / ADR 0248 / Issue `#611` 完整清償）
- **發現來源**: Spec 0246 雙軸 `/code-review`（終審 PASS，Commit `4f439b7`，Issue `#607`）
- **標籤**: `Refactor` · `CleanCode` · `DRY` · `MarketSync` · `NAS-Scheduler`
- **預計觸發時機**: 後續擴充第 5 條市場同步軌道、將排程狀態持久化至 SQLite 或重構 NAS 排程器時一併收斂

---

## 背景與現況

Spec 0246 雙軸審查全數 PASS（零阻斷項與零狀態機缺陷），但記錄 2 項非阻斷架構與代碼整潔度改善空間：

1. **雙重重試帳本 (Duplicated Retry Ledger)**：
   - `scripts/market-sync/lakehouse-sync-coordinator.cjs`（第 41–51 行 `laneRetryState`）與 `scripts/market-sync/nas-autonomous-scheduler.cjs`（第 36–77 行 `lastRunState.lanes[].retryCount`）各自維護同日軌道重試計數。
   - 因此排程器在 `reconcileTwLakehouse` 遭遇冷卻略過、Phase 1 寫價成功或 Phase 1 配額耗盡時，須額外於第 388、393、400 行手動執行 `twLane.retryCount = Math.max(0, twLane.retryCount - 1)` 補償回扣。
   - **建議重構**：將各軌每日重試計數與冷卻帳本單一收斂至協調中樞 `lakehouse-sync-coordinator.cjs` 作為 SSOT，排程器改採唯讀查詢，消除跨檔狀態同步與手動回扣。
2. **`nas-autonomous-scheduler.cjs` 長函式與發散式變更 (Long Method / Divergent Change)**：
   - `runTickNow`（第 316–563 行，約 248 行）與 `evaluateScheduleWindow`（第 161–269 行，約 109 行）同時承擔四軌排程決策、舊版 `handlers.runDailySync` 相容分支、各軌結果判讀與滾動備份觸發。
   - **建議重構**：抽離獨立分軌執行輔助函式（`executeTwDailyLane`、`executeUsDailyLane`、`executeMacroLane`、`executeWeeklyLane`）與各軌決策小函式，降低單一函式圈複雜度並便於未來新增市場軌道。
