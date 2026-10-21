# 13-tw-insider-pledge-records-ingestion

## Description
在本地 Lakehouse 中建立台股董監持股質押資料表 `tw_insider_pledge_records`，並撰寫抓取腳本 `ingest-tw-pledge.cjs`，定期自政府資料開放平臺（data.gov.tw）或公開資訊觀測站下載台股全市場「董監事持股質押明細表」與「內部人股權異動申報明細」。

## Target Files
- `scripts/market-sync/sqlite-db-core.cjs`
- `scripts/market-sync/ingest-tw-pledge.cjs`

## Acceptance Criteria
- [x] 於 `sqlite-db-core.cjs` 建立 `tw_insider_pledge_records`：
  - 欄位：`symbol`, `report_date`, `pledged_shares`, `total_director_shares`, `pledge_ratio`, `insider_transfer_shares`。
  - 主鍵：`(symbol, report_date)`。
- [x] 實作 `ingest-tw-pledge.cjs`：每月初或排程自動獲取政府開放平臺最新董監質押資料（JSON/CSV，免 Key）。
- [x] 計算質押比率：`pledge_ratio = (pledged_shares / total_director_shares) * 100`。
- [x] 撰寫單元測試驗證質押比例計算與數據寫入庫的正確性。

## Status
- [x] done
