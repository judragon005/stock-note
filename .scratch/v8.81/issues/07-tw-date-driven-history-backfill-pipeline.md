# 07-tw-date-driven-history-backfill-pipeline

## Description
在 `scripts/market-sync/` 中建立全新的台股日期驅動歷史回補模組 `backfill-tw-history-web.cjs`。完全不依賴本地任何 D 槽 CSV 歷史檔案，純粹連線 TWSE 與 TPEx 官方每日全市場聚合端點（MI_INDEX, T86, 1430, 3itrade_hedge），遍歷過去 250 個交易日，批次將全市場 2,361+ 檔標的之開高低收、真實成交筆數（transactions）與三大法人籌碼寫入 SQLite，每請求間隔 3 秒並支援休市日自動跳過。

## Target Files
- `scripts/market-sync/backfill-tw-history-web.cjs`
- `scripts/market-sync/backfill-tw-history-web.test.cjs`

## Acceptance Criteria
- [x] 實作日期迭代器，支援指定天數（預設 250 個交易日，約往前 1 年）。
- [x] 每個交易日發出 4 個官方 HTTP 請求：
  - TWSE `MI_INDEX` (上市收盤價量與成交筆數)
  - TWSE `T86` (上市三大法人)
  - TPEx `1430` (上櫃收盤價量與成交筆數)
  - TPEx `T86` (上櫃三大法人)
- [x] 每次請求之間強制延遲 3,000ms（防爬蟲禮儀），遭遇非交易日自動辨識並跳過。
- [x] 代碼寫入時自動剝除櫃買標的 `O` 尾綴，代碼全量標準化。
- [x] 成果批次寫入 `daily_candles`（含 `transactions`）與 `tw_institutional_chips`。
- [x] 撰寫單元測試模擬 TWSE/TPEx 響應，驗證解析與入庫邏輯正確無誤。

## Status
- [x] done
