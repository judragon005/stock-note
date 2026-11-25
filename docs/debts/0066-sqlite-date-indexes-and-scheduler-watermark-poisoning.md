# Debt 0066: SQLite 四大高頻表日期索引補齊、NAS 排程三軌假性成功防禦與審計腳本日曆收斂 (Wave 1)

- **優先級 (Priority)**: `P1`
- **狀態 (Status)**: `RESOLVED`（已於 v9.30.0 · Spec 0248 / ADR 0248 / Issue `#611` 完整清償）
- **發現來源**: Spec 0247 五路正交法醫審計 (Issue `#609`)
- **標籤**: `Performance` · `Reliability` · `SQLite` · `NAS-Scheduler` · `Wave1`
- **預計觸發時機**: Wave 1（規劃為 `Spec 0248`，與 [Debt 0065](0065-nas-scheduler-retry-ledger-and-decomposition.md) 一併清償）

---

## 背景與現況

1. **SQLite 4 張核心大表缺日期首欄索引致高頻全表掃描**：
   - `tw_tdcc_distribution`、`tw_monthly_revenue`、`tw_valuation_daily`、`etf_daily_nav` 僅建立 `(symbol, date/year_month)` 複合索引，導致每次 `/healthz` 與 `/api/market/sync-status` 觸發 7 次全表掃描，`/api/market/macro` 與 `/api/market/breadth` 亦對 `tw_monthly_revenue` 與 `tw_institutional_chips` 全表掃描。
2. **NAS 排程三軌「假性成功水位線毒化」與重啟配額重置**：
   - Macro 軌全網失敗寫入全 `NULL` 列仍推進水位線（且 UTC/TPE 日期錯位）；Weekly 軌網路異常回傳 `{ savedCount: 0 }` 未拋錯仍推進水位線；US Daily 軌 1,500 檔僅成功 1 檔即判定 `usOk = true` 推進水位線。
   - 協調中樞 `laneRetryState` 與排程器狀態純存於記憶體，Docker OOM 重啟後歸零恐觸發啟動暴衝迴圈。
3. **審計與平行解析器日曆／權證漂移**：
   - `scripts/market-sync/audit-verifier.cjs` 硬編碼過期 2026 休市日曆而非引用 `trading-calendar-engine.cjs`；`scripts/market-sync/ingest-tw-quotes.cjs` 保留第三份平行解析器且未濾除櫃買權證。

## 建議演進方向

1. 於 `sqlite-db-core.cjs` 補齊上述 4 表之日期／年月首欄索引，以 `EXPLAIN QUERY PLAN` 驗證 `/healthz` 零 `SCAN`。
2. 配合 Debt 0065 將單一重試帳本持久化至 SQLite，並收緊 Macro/Weekly/US 成功門檻與時區口徑對齊。
3. 統一 `audit-verifier.cjs` 至共享休市日曆引擎，並收斂 `ingest-tw-quotes.cjs` 權證濾除規則。
