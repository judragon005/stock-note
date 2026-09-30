# 02 — 歷史回補引擎對接本地 Compact 資料庫與 Yahoo 429 防限流降級 (Backfill Engine Hydration & Yahoo 429 Fallback)

**What to build:**
在 `vite.config.ts` 補齊 `/api/yahoo` 代理之桌面瀏覽器 `User-Agent` 與 `Referer`。
在 `src/engine/historicalOhlcvBackfill.ts` 中升級降級管線：當 Yahoo Finance 回傳 `429 Too Many Requests` 或連線中斷且 IndexedDB 缺乏歷史時，自動從本地 compact 資料庫提取歷史日 K，並與當日盤後收盤價執行 `mergeDailyCandles` 合流，重新計算技術指標並持久化至 IndexedDB。

**Blocked by:** 01 — 本地緊湊日 K 歷史載入器與格式轉換

**Status:** completed

- [x] `vite.config.ts` 中的 `/api/yahoo` 代理加入 `User-Agent` 與 `Referer` 標頭，降低被限流機率。
- [x] `backfillSymbolOhlcvAndIndicators` 遭遇 429 時 Fast-Fail，不卡住流程。
- [x] 當遠端失敗且本地 IndexedDB 根數 < 5 時，自動調用 `loadSymbolCompactHistory` 與 `getLatestSummaryQuote` 進行合流。
- [x] 合流後的有效日 K 數列重新計算技術指標，並成功寫入 IndexedDB。
- [x] 單元測試驗證 Yahoo 429 情境下的全自動無縫降級（`src/engine/historicalOhlcvBackfill.test.ts`）。
