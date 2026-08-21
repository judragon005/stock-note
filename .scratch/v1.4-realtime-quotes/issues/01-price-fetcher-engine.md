# 01 — 多源即時/延遲報價核心引擎與 CORS 代理容錯 (Ticket 1)

**GitHub Issue:** [#47](https://github.com/judragon003/-/issues/47)

**What to build:**
實作純前端多源免費報價核心模組 `src/engine/priceFetcher.ts`。支援 Yahoo Finance API (v8/v7) 台美股代碼正規化（台股上市 `.TW` / 上櫃 `.TWO` / ETF、美股）、TWSE 官方 OpenAPI 每日收盤價備援、多節點 CORS 代理池（`corsproxy.io`、`allorigins`、`codetabs`）重試與 4000ms 超時熔斷機制，以及批次並行抓取函式 `fetchBatchStockQuotes`。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 實作 `normalizeYahooSymbol` 支援台股上市/上櫃與美股代碼轉換。
- [x] 實作 `fetchWithCORSProxy` 支援多節點代理池輪替與 AbortSignal 超時熔斷。
- [x] 實作 `parseYahooQuoteResponse` 與 `parseTWSEDayAllResponse` 解析成交價、前一日收盤價、漲跌額與百分比。
- [x] 實作 `fetchStockQuote` 支援主來源異常時平滑降級至 TWSE OpenAPI。
- [x] 實作 `fetchBatchStockQuotes` 批次並行拉取多檔標的。
- [x] 撰寫 `src/engine/priceFetcher.test.ts` 11 項單元測試並 100% 通過。
