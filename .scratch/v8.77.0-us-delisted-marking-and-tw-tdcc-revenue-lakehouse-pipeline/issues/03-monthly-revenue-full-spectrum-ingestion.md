# 03-monthly-revenue-full-spectrum-ingestion

## Description
強化 `scripts/market-sync/ingest-tw-monthly-revenue.cjs`，提供全市場台股上市櫃公司最新月營收與成長率批次入庫，寫入 `tw_monthly_revenue` 資料表（包含年月、營收、MoM、YoY、累計 YoY），並支援公開資訊觀測站 API 與離線批次載入。

## Acceptance Criteria
- [ ] `saveMonthlyRevenueToSqlite` 支援批次寫入並具備衝突覆蓋更新。
- [ ] 執行腳本後可將有效月營收數據寫入本機 `market_history.db`。
- [ ] 撰寫單元測試驗證多月份營收與年增率入庫讀取。

## Status
- [x] done
