# 03 — 智慧交易時段判定與開盤背景自動輪詢 Hook (Ticket 3)

**GitHub Issue:** [#49](https://github.com/judragon003/-/issues/49)

**What to build:**
實作自訂 Hook `src/hooks/usePriceAutoRefresh.ts`。精確判定台股時段（週一至週五 09:00~13:30 台北時間）與美股時段（美東 09:30~16:00 / 夏令台北 21:30~04:00）；於開盤時段啟動 60 秒背景輪詢，休市期間暫停定時器；過濾已鎖定標的與 0 股標的；提供 `refreshAll`、`refreshSymbol`、`toggleSymbolLock` 等介面；撰寫單元測試覆蓋時段計算與輪詢排程。

**Blocked by:** 01-price-fetcher-engine, 02-quote-storage-and-locking

**Status:** completed

- [x] 實作 `isTaiwanMarketOpen`、`isUSMarketOpen`、`isAnyMarketOpen` 時段判定函式。
- [x] 實作 `orchestrateBatchRefresh` 輪詢調度核心，精準過濾已鎖定與 0 股標的。
- [x] 實作 `usePriceAutoRefresh` 自訂 Hook，包含進站初始同步、60秒定時輪詢、單檔強制刷新與鎖定切換。
- [x] 撰寫 `src/hooks/usePriceAutoRefresh.test.ts` 6 項單元測試並 100% 通過。
