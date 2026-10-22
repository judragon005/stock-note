# 11 — Tiingo 美股行情抓取與 Yahoo 429 降級備援守衛

**Category:** enhancement
**Status:** closed
**Blocked by:** 04 — Tiingo API 專屬測活探針與端點整合

**What to build:**
美股行情採集管線具備智慧雙軌容錯。平時優先調用免費公開之 Yahoo Finance，一旦偵測到 HTTP 429 限流或逾時，自動檢查金鑰池中的 Tiingo 金鑰，無縫降級切換至 Tiingo 官方 API 抓取在倉持股（Tier 0）之高精度歷史日 K、除息現金與拆股因子。

**Acceptance criteria:**
- [x] 於 `scripts/market-sync/ingest-us-quotes.cjs` 實作 `fetchTiingoHistoricalQuotes(symbol, key, days)`
- [x] 欄位精準映射：`date, open, high, low, close, adjClose, adjVolume, divCash, splitFactor`
- [x] 於 `scripts/market-sync/sync-us-market.cjs` 建立 Yahoo 429 降級守衛，自動切換至 Tiingo
- [x] 撰寫單元測試模擬 429 狀況下的 Tiingo 降級切換與資料入庫

