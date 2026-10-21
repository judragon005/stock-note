# 01 — SQLite 湖倉結構擴展與覆蓋索引建立 (集保大戶表與月營收表)

**What to build:** 
在 `scripts/market-sync/sqlite-db-core.cjs` 中擴展初始化 DDL，新增集保千張大戶股權表 (`tw_tdcc_distribution`) 與月營收成長表 (`tw_monthly_revenue`)，並建立複合覆蓋索引，支援 schema 冪等性初始化與向後相容。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 在 `sqlite-db-core.cjs` 新增 `tw_tdcc_distribution(symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at)`
- [x] 在 `sqlite-db-core.cjs` 新增 `tw_monthly_revenue(symbol, year_month, revenue, last_year_revenue, yoy_rate, mom_rate, is_all_time_high, updated_at)`
- [x] 建立 `idx_tdcc_symbol_date` 與 `idx_revenue_symbol` 高效複合索引
- [x] 撰寫單元測試 `tests/market-sync/schema-expansion.test.ts` (實作於 `src/engine/schemaExpansion.test.ts`) 驗證 DDL 執行多次不拋錯且資料表結構精確
