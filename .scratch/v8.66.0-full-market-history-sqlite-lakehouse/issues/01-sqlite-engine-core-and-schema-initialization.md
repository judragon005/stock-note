# 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化 (SQLite Engine Core & Schema Initialization)

**What to build:**
建立 `scripts/market-sync/sqlite-db-core.cjs` 與 TypeScript 型別定義 `src/types/marketLakehouse.ts`。
配置 SQLite 本地數據庫檔案路徑 `.scratch/market-cache/market_history.db`。
啟用 WAL 模式 (`PRAGMA journal_mode = WAL;`) 與繁忙逾時鎖定機制 (`PRAGMA busy_timeout = 5000;`)。
初始化四大核心資料表 DDL：
1. `symbols_meta` (symbol, name, market, exchange, type, status, updated_at)
2. `daily_candles` (symbol, date, open, high, low, close, adj_close, volume, turnover, PRIMARY KEY(symbol, date))
3. `tw_institutional_chips` (symbol, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance, sbl_balance, day_trade_rate, PRIMARY KEY(symbol, date))
4. `sync_checkpoints` (market, symbol, last_success_date, last_attempt_at, status, error_msg, PRIMARY KEY(market, symbol))

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 實作 `initSqliteLakehouseDb()` 與 `getSqliteDbConnection()`，支援連線單例與自動建表。
- [x] 驗證 SQLite 成功開啟 WAL 模式與 busy_timeout 設定。
- [x] 四大資料表 DDL 正確建立，包含主鍵約束與索引 (`idx_candles_date`, `idx_chips_date`)。
- [x] 提供 `closeSqliteDb()` 優雅釋放檔案鎖定。
- [x] 單元測試 `src/engine/sqliteLakehouseCore.test.ts` 驗證資料庫建立、連線、基本 CRUD 與表格存在性 100% 通過。
