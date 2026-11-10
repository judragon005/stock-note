# 03 — 台美市場結構寬度獨立定錨、權證剔除與 200MA 寬度修復

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
系統在計算全市場 20MA / 60MA / 200MA 均線站上比例（市場結構寬度）時，將台股與美股的交易日曆與視窗邊界徹底隔離；台股僅統計 4 碼普通股與 `00` 開頭 ETF，排除 4,660 檔 6 碼認購/認售權證干擾；200MA 合格門檻設為合理交易日下限（`Math.min(180, marketAvailableDates.length)`），並同步補齊 `totalFilteredStocks` 欄位對齊。徹底解決 `200MA = 0.0%`、權證稀釋與畫面「共 [空白] 檔」問題。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/sqlite-db-core.cjs` 的 `getMarketMultiHorizonBreadth` 中，依市場分類（台股：`LENGTH(symbol) = 4 AND symbol GLOB '[0-9][0-9][0-9][0-9]'` 或 `symbol LIKE '00%'`；美股：`NOT GLOB '[0-9]*'` 且非指數）獨立查詢其最新有效交易日與近 200 個交易日邊界
- [ ] 排除 6 碼認購/認售權證（如 `70xxxx`、`71xxxx`、`72xxxx`、`73xxxx`），確保台股母體精準收斂至約 2,300+ 檔真實上市櫃普通股與 ETF
- [ ] 將 200MA 資格篩選條件 `minRequired200` 設為 `Math.min(180, availableDates.length)`，允許長假停牌或單一市場交易日數正常計算，杜絕分母歸零陷阱
- [ ] 在回傳物件中對齊 `totalStocks` 與 `totalFilteredStocks` 雙向屬性，使前端卡片完整呈現「共 2,333 檔」
- [ ] 編寫單元測試驗證台美日曆不同步、跨日單筆美股干擾以及權證過濾後 20/60/200MA 計算之正確性

