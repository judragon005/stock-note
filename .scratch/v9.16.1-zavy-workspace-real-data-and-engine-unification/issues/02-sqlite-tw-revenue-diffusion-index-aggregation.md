# 02 — 本地 SQLite tw_monthly_revenue 動態營收擴散指數與總營收年增率聚合

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
系統在提供總經指標時，不依賴外部私有 CSV 或脆弱的第三方網頁爬蟲，而是直接從本地 SQLite `tw_monthly_revenue` 資料表（全市場 1,957 家 4 碼上市櫃公司真實月營收）動態計算出最新月份之「企業營收擴張擴散指數 (Diffusion Index，50 為榮枯線)」與「全市場總營收年增率 (YoY %)」，並透過 `/api/market/macro` API 端點回傳前端，為台灣小車提供 100% 真實的基本面擴張動能數據。

**Blocked by:** [#479](https://github.com/judragon005/stock-note/issues/479) (Ticket 01)

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/sqlite-db-core.cjs` 實作 `getTwRevenueDiffusionAndYoY(dbOrPath)` 函式，過濾 `LENGTH(symbol) = 4 AND symbol GLOB '[0-9][0-9][0-9][0-9]'` 之 4 碼普通股
- [ ] 按照標準擴散指數公式 `(YoY正成長家數 + 0.5 × 持平家數) / 總有效家數 × 100` 動態算出台灣企業營收擴張擴散指數（50 為擴張榮枯分水嶺）
- [ ] 按照總額比率公式 `(SUM(revenue) - SUM(last_year_revenue)) * 100 / SUM(last_year_revenue)` 動態計算最新月份之全市場總營收年增率 (%)
- [ ] 在 `scripts/market-sync/vite-market-middleware.cjs` 的 `GET /api/market/macro` 端點將營收擴散指數與年增率回傳至 `twRevenueDiffusion` 欄位
- [ ] 編寫單元測試驗證空表、單筆與真實歷史月份營收聚合計算之正確性與防除以零保護

