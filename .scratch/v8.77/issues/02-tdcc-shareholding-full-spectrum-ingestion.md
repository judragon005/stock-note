# 02-tdcc-shareholding-full-spectrum-ingestion

## Description
強化 `scripts/market-sync/ingest-tw-tdcc.cjs`，提供全市場台股上市櫃公司最新集保股權分散表批次入庫，寫入 `tw_tdcc_distribution` 資料表（包含統計日期、千張大戶比例、總人數等），並支援本地 Mock/官方 API 雙軌模式。

## Acceptance Criteria
- [ ] `saveTdccDistributionToSqlite` 支援批次寫入並具備衝突更新覆蓋。
- [ ] 執行腳本後可將有效 TDCC 數據寫入本機 `market_history.db`。
- [ ] 撰寫單元測試驗證批次寫入與讀取精確性。

## Status
- [x] done
