# 01 — 湖倉索引補強與入庫深度解耦 (Storage Depth & Indexing)

**What to build:**
1. 在 `scripts/market-sync/sqlite-db-core.cjs` 中建立 `tw_institutional_chips(symbol, date DESC)` 複合覆蓋索引，並將 `PRAGMA busy_timeout` 調升至 15000ms，徹底消除百萬級歷史數據排序與 Windows 檔案鎖衝突。
2. 在 `scripts/market-sync/backfill-local-csv.cjs` 與 `scripts/market-sync/ingest-historical-chips.cjs` 中，將入庫 `limit` 預設值由 `260` 調整為 `0`（全量無限制入庫），解除人為截斷，使本機自 2016 年至今累積的十餘年真實歷史日 K 與籌碼 CSV 可 100% 完整灌入 SQLite 湖倉。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] `sqlite-db-core.cjs` 包含 `idx_chips_symbol_date` 索引與 15000ms `busy_timeout`
- [x] `backfill-local-csv.cjs` 入庫不再截斷為 260 根，傳入 limit=0 或未指定時全量保留
- [x] `ingest-historical-chips.cjs` 入庫不再截斷為 260 根，支援全歷史籌碼寫入
- [x] 撰寫單元測試覆蓋索引建立與無截斷入庫行為 (`src/engine/lakehouseStorageDepthAndIndexing.test.ts`)
