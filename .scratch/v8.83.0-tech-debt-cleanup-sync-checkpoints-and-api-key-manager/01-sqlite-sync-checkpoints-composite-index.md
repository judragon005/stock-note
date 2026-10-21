# 01 — SQLite 斷點檢查點複合狀態索引優化 (Debt 0041)

**Parent:** Issue #193 / Spec 0171

**What to build:**
在 SQLite 湖倉核心資料表初始化中新增複合狀態索引 `idx_sync_checkpoints_lookup(market, status, last_success_date)`，確保在萬級標的規模下，美股與全市場斷點續傳的狀態過濾與日期查詢保持常數時間 ($O(1)$) 檢索。

**Blocked by:** None — can start immediately

**Status:** closed

## Acceptance Criteria
- [x] 在 `scripts/market-sync/sqlite-db-core.cjs` 中追加 `CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_lookup ON sync_checkpoints(market, status, last_success_date);`。
- [x] 編寫或更新單元測試，驗證資料庫初始化時該索引正確存在且能被 `EXPLAIN QUERY PLAN` 命中。
- [x] 既有 SQLite 資料庫與 lakehouse 測試保持 100% 通過。
