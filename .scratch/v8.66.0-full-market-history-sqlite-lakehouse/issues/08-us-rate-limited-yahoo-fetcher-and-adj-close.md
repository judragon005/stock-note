# 08 — 美股 Yahoo Chart 日 K 限流採集器與還原價計算 (US Rate-Limited Yahoo Fetcher & Adj Close)

**What to build:**
實作 `scripts/market-sync/ingest-us-quotes.cjs`。
從 Yahoo Finance API (`/v8/finance/chart/{symbol}`) 抓取美股最近 250 天歷史日 K。
防禦性提取原始高低開收量及還原收盤價 (`adjclose`)，儲存至 `daily_candles`。
實施單 IP 節流閥（請求間隔 800ms ~ 1200ms），每批次之間隨機抖動避免規律被辨識。
當遇到 HTTP 429 或 503 時，拋出具體限流錯誤以觸發上層退避重試。

**Blocked by:** 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化, 02 — 標的註冊表種子入庫與 30ms 模糊搜尋索引

**Status:** ready-for-agent

- [ ] 支援從 Yahoo Finance 抓取指定標的 250 天日 K 與還原收盤價。
- [ ] 驗證遇到股票分割（如 NVDA 拆股）時，還原收盤價與除權息因子計算正確，無價格斷層。
- [ ] 內建 800ms~1200ms 自適應請求間隔防禦。
- [ ] 成功寫入 SQLite `daily_candles`（標記 market='US'）。
- [ ] 單元測試 `ingest-us-quotes.test.cjs` 驗證 mock Yahoo Chart 封包解析、還原價轉換與限流錯誤拋出 100%。
