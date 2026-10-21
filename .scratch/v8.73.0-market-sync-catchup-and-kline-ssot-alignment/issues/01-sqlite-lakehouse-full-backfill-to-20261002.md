# 01 — 執行全市場歷史 CSV 全量回補至 SQLite 本機湖倉

**What to build:** 將本機 2,361 檔台股歷史日 K 與籌碼全量灌入 SQLite `.scratch/market-cache/market_history.db`，確保最新交易日推進至 `2026-10-02`，為後續介面與 API 提供基石資料。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 執行 `scripts/market-sync/backfill-local-csv.cjs` 灌庫成功
- [x] 驗證 SQLite `daily_candles` 台股標的 `MAX(date)` 推進至 `2026-10-02`
- [x] 驗證 2360 與 0050 最新日 K 數值精確無誤
