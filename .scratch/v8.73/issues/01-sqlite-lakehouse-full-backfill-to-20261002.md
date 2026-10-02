# Ticket 01: 執行全市場歷史 CSV 數據庫全量灌入 SQLite 湖倉 (推進至 2026-10-02)

## 目標
執行 `scripts/market-sync/backfill-local-csv.cjs`，將本機 `D:\APP\諮詢\私人\股市\台股加權指數_歷史數據` 已更新至 2026-10-02 的 2,360 檔台股歷史日 K 與籌碼，全量匯入 SQLite `.scratch/market-cache/market_history.db`。

## 驗收條件
1. 查詢 SQLite `daily_candles`，台股標的（如 2360、2330、2886）之 `MAX(date)` 均推進至 `2026-10-02`。
2. 2360 致茂在 2026-10-02 之收盤價為 2190，開盤 2145，最高 2225，最低 2135，成交量 3,257,024。
