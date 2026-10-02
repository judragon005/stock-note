# 01 — 台股每日同步與歷史數據寫入 SQLite 本地湖倉 (SQLite Lakehouse TW Ingestion & History Sync)

**What to build:**
1. 修改 `scripts/market-sync/sync-tw-market.cjs`：
   - 於 `[4/4] 持久化寫入本地快取資料庫...` 區塊，引入 `ingest-tw-quotes.cjs` 之 `saveTwQuotesToSqlite`，將當日全市場收盤行情 (`allQuotes`) 事務寫入 SQLite `daily_candles` 資料表。
   - 將當日三大法人買賣超 (`allChips`) 事務寫入 SQLite `tw_institutional_chips` 資料表。
2. 擴充 `scripts/market-sync/backfill-local-csv.cjs`：
   - 在剖析本機個股歷史 CSV 後，除了產生現有的 JSON 快取外，同步將 `alignedCandles` 批次事務寫入 SQLite `daily_candles`，使 2,400+ 檔台股在 SQLite 中擁有完整 120~250 根歷史數列。
3. 提供獨立驗證指令，確保 `node scripts/market-sync/sync-tw-market.cjs` 執行後，`daily_candles` 內之台股標的（如 2886、2330）正確包含最新日期之日 K 記錄。

**Blocked by:** None — can start immediately

**Status:** pending

- [ ] 於 `sync-tw-market.cjs` 中引入 `saveTwQuotesToSqlite`，完成收盤價與三大法人籌碼之 SQLite 入庫。
- [ ] 擴充 `backfill-local-csv.cjs` 將台股歷史 CSV 數據批次灌入 SQLite `daily_candles`。
- [ ] 撰寫單元/整合測試，驗證 SQLite `daily_candles` 與 `tw_institutional_chips` 寫入成功與冪等性 (UPSERT)。
