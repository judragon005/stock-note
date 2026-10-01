# 04 — 台股官方 TWSE/TPEx 收盤日 K 批次入庫 (TWSE & TPEx Daily Quotes Bulk Ingestion)

**What to build:**
實作 `scripts/market-sync/ingest-tw-quotes.cjs`。
抓取 TWSE `MI_INDEX`（上市收盤行情）與 TPEx `afterTrading/otc_quotes_no1430`（上櫃收盤行情）。
使用單次 SQLite 事務批次將全市場 2,400+ 檔股票當日之 open, high, low, close, adj_close, volume, turnover 寫入 `daily_candles`。
支援傳入自訂日期字串（如 `2026-09-30`），在休市日或無交易時段優雅返回 `MARKET_CLOSED`，單次全市場入庫時間 < 15 秒。

**Blocked by:** 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化, 02 — 標的註冊表種子入庫與 30ms 模糊搜尋索引

**Status:** ready-for-agent

- [ ] 支援從 TWSE 與 TPEx 官方下載當日全市場收盤總表。
- [ ] 將非數值字串（如 `--`、漲跌停記號）安全解析為合法浮點數。
- [ ] 啟用 SQLite 批次事務寫入，全市場 2,400+ 檔標的於 15 秒內完成入庫。
- [ ] 重複日期入庫時採用 `INSERT OR REPLACE` 冪等性覆蓋。
- [ ] 單元測試 `ingest-tw-quotes.test.cjs` 驗證 mock TWSE/TPEx 官方封包解析與資料庫寫入正確性 100%。
