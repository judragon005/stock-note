# 01 — 本地緊湊日 K 歷史載入器與格式轉換 (Compact History Loader & Single-Request Cache)

**What to build:**
在 `src/engine/marketCacheLoader.ts` 中新增 `loadSymbolCompactHistory(symbol: string): Promise<DailyCandle[] | null>` 與 `getLatestSummaryQuote(symbol: string): Promise<DailyCandle | null>`。
具備單例 Promise 快取機制，避免多次重複發送 HTTP 請求解析 17.5 MB 的 `tw_market_ohlcv_compact.json`。
將 compact 格式 `{ d, o, h, l, c, v }` 轉換為標準 `DailyCandle` 實體。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] `loadSymbolCompactHistory` 能從 `/market-cache/tw_market_ohlcv_compact.json` 取得特定台股標的歷史日 K 並格式化為 `DailyCandle[]`。
- [x] 支援記憶體單例請求快取，確保同一個 session 內多次調用不會重複 fetch 該 17.5MB JSON。
- [x] 若標的不在 compact 快取中，安全回傳 `null`。
- [x] `getLatestSummaryQuote` 能從 `/market-cache/tw_market_summary.json` 提取當日最新單筆收盤價。
- [x] 單元測試覆蓋公開介面（`src/engine/marketCacheLoader.test.ts`）。
