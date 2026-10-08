# Ticket 01: 台股盤後收盤官方真實成交筆數解析與 SQLite 湖倉入庫修復

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 1 / AC 1.1)

## 問題背景
目前在 `market-sync-core.cjs` 中，`parseTwseDailyQuotesBulk` 未提取 TWSE MI_INDEX 第 4 欄之 `transactions`；`parseTpexDailyQuotesBulk` 誤將 TPEx 1430 第 8 欄成交筆數當成成交股數；且 `ingest-tw-quotes.cjs` 寫入 `daily_candles` 之 SQL 未包含 `transactions` 欄位。造成收盤行情入庫時 transactions 均為 `NULL`，戰情室頂部面板誠實呈現破折號 `-`。

## 任務細節
1. 修改 `scripts/market-sync/market-sync-core.cjs`：
   - `parseTwseDailyQuotesBulk`：提取 `row[3]` 作為 `transactions`。
   - `parseTpexDailyQuotesBulk`：提取 `row[7]` 作為 `transactions`，`row[8]` 作為 `volume`。
2. 修改 `scripts/market-sync/ingest-tw-quotes.cjs`：
   - 在 `daily_candles` 的 `INSERT ... ON CONFLICT DO UPDATE` 語句中加入 `transactions` 欄位持久化。
3. 提供快速修復或遷移腳本，將本機資料庫 `daily_candles` 中最新交易日之台股標的補充真實 transactions。

## 驗收標準
- [x] 執行 `npm test` 相關行情解析與入庫測試 100% 通過。
- [x] 查詢本機 SQLite `daily_candles` 中 3260、2330 最新日 K，`transactions` 具備有效正整數（如 1000 筆以上，非 NULL 或 0）。
- [x] 戰情室頂部 `HeaderMarketBar` 正確顯示千分位格式成交筆數（如 `3,958` 或真實筆數），不再是 `-`。
