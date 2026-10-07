# 02-sqlite-daily-candles-transactions-schema

## Description
在 `scripts/market-sync/sqlite-db-core.cjs` 中升級 `daily_candles` 資料表綱要，新增 `transactions INTEGER`（真實成交筆數）欄位。在資料庫初始化函式 `initSqliteLakehouseDb` 中實作無損動態遷移（Non-destructive Migration），若既有資料表無該欄位則自動執行 `ALTER TABLE`，確保零停機相容。

## Target Files
- `scripts/market-sync/sqlite-db-core.cjs`
- `src/engine/sqliteDailyCandlesTransactions.test.ts`

## Acceptance Criteria
- [x] `daily_candles` 表結構定義包含 `transactions INTEGER` 欄位。
- [x] `initSqliteLakehouseDb` 在開啟資料庫時自動透過 `PRAGMA table_info(daily_candles)` 檢查，缺失時平滑執行 `ALTER TABLE daily_candles ADD COLUMN transactions INTEGER;`。
- [x] 支援在批次插入/更新日 K 時安全寫入 `transactions` 數值（數值缺失時為 `NULL`）。
- [x] 單元測試驗證新建庫與舊庫遷移兩種情境均無錯誤，且既有百萬級歷史數據零損壞。

## Status
- [x] done

