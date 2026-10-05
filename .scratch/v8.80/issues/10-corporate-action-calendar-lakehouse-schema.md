# 10-corporate-action-calendar-lakehouse-schema

## Description
在本地 Lakehouse SQLite（`sqlite-db-core.cjs`）與前端 IndexedDB 中新增公司除權除息與重大行動預告表 `corporate_action_calendar`，定義標準欄位與索引，供定時排程寫入與前端引擎查詢。

## Target Files
- `scripts/market-sync/sqlite-db-core.cjs`
- `src/types/corporateAction.ts`
- `src/utils/db.ts`

## Acceptance Criteria
- [x] 於 `sqlite-db-core.cjs` 新增 `corporate_action_calendar` 資料表：
  - 欄位：`symbol`, `market`, `action_type`, `ex_date`, `payment_date`, `cash_dividend_per_share`, `split_ratio`, `announcement_date`, `created_at`。
  - 複合主鍵：`(symbol, action_type, ex_date)`。
- [x] 於 `src/types/corporateAction.ts` 定義對應之 TypeScript 介面 `CorporateActionCalendarRecord`。
- [x] 擴充 `src/utils/db.ts`（IndexedDB），建立同名物件倉庫（Object Store）與索引 `by-symbol`, `by-ex-date`。
- [x] 撰寫單元測試驗證 SQLite 與 IndexedDB 之建表、插入、去重與查詢功能。

## Status
- [x] done
