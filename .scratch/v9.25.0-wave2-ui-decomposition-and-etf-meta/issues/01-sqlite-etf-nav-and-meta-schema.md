# T01: SQLite 湖倉 etf_daily_nav 冪等欄位升級與 etf_meta 建表
- 關聯 Issue: #596 / Spec 0241 / Debt 0061 #3
- 目標檔案: `scripts/market-sync/sqlite-db-core.cjs`
- 驗收: 舊庫自動 `ALTER TABLE` 補齊 `issued_units`, `unit_change`, `aum_billion`；建立 `etf_meta` 表與查詢輔助。
