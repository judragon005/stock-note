# 03 — 大盤基準非同步請求本機 SQLite 湖倉日 K 並自適應重繪

**What to build:**
修復大盤基準（TAIEX、0050、SPY）停留在靜態 fallback 常數的問題。在 `PortfolioGrowthChart.tsx` 中增加非同步載入機制，當切換大盤基準時，調用已封裝之 `loadBenchmarkDailyPricesAsync(benchmarkType)`，取得本機 SQLite 湖倉即時日 K，並存入本地 state 觸發對齊與重繪，確保基準對比具備最新交易日數據。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 在 `src/components/PortfolioGrowthChart.tsx` 增加 `benchmarkLoadedMap` 本地 state
- [x] 透過 `useEffect` 監聽 `benchmarkType`，若非 `NONE` 則非同步調用 `loadBenchmarkDailyPricesAsync(benchmarkType)`
- [x] 湖倉日 K 資料載入完成後即時更新對齊走勢與量化指標
- [x] 撰寫單元測試驗證切換基準時能正確觸發非同步資料水合並更新圖表
