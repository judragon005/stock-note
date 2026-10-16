# 02 — 歷史修剪器安全封印 (Retention Pruning Neutralization)

**What to build:**
封印 `scripts/market-sync/retention-cleaner.cjs` 中對 `daily_candles` 與 `tw_institutional_chips` 的基於天數自動 `DELETE` 指令。修剪器僅保留清理過期暫存檔案 (`*.tmp`, `*.temp`)、檔案鎖殘留清理與 SQLite `VACUUM` 磁碟重組整理，確立「歷史數據 Append-Only、永不自動刪除」之安全邊界。

**Blocked by:** 01 — 湖倉索引補強與入庫深度解耦 (Storage Depth & Indexing)

**Status:** completed

- [x] `retention-cleaner.cjs` 移除 `DELETE FROM daily_candles` 與 `DELETE FROM tw_institutional_chips` 破壞性邏輯
- [x] 修剪器安全執行後，原有長天期（如 500 根以上）歷史日 K 與籌碼完整保存，筆數 0 遺失
- [x] 撰寫單元測試驗證修剪器的無害性與暫存清理行為 (`src/engine/lakehouseRetentionNeutralization.test.ts` & `src/engine/retentionCleaner.test.ts`)
