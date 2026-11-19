# 06 — 美股基本面與 13F 湖倉表 (us_fundamentals_daily)、Yahoo quoteSummary Crumb 聚合與美股歷史配息

**Parent:** #592 (Spec 0239)
**What to build:** 建立冪等 SQLite 表 `us_fundamentals_daily`，透過本地中介層伺服器端整合免費 Yahoo Finance v10 `quoteSummary`（含自動 Cookie/Crumb 緩存、24 小時 SQLite TTL 與 429 熔斷降級）及 Yahoo Chart `events=div` 美股歷史配息寫入 `corporate_action_calendar` (`market='US'`)；使 `/api/market/history/:symbol` 與湖倉載入器針對任意美股個股與美股 ETF 完整回傳 `pe`、`forwardPe`、`pb`、`psRatio`、`dividendYield`、`us13fData`（機構比/內部人/Short Float/公眾流通比）、`etfAumBillion`、`etfExpenseRatio` 與歷史配息。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用, 02 — 單一權威資產分類器 (resolveAssetClass)、名稱解析參數校正與雙市場結算時區引擎
**Status:** ready-for-agent

- [ ] SQLite 啟動初始化自動以 `CREATE TABLE IF NOT EXISTS` 建立 `us_fundamentals_daily`，對既有 `market_history.db` 零破壞且冪等。
- [ ] 伺服器端 Yahoo `quoteSummary` 抓取器正確解析個股估值、13F/Short Float 與美股 ETF 費用率/AUM/淨值並持久化至 `us_fundamentals_daily`（24H 內命中快取零外部請求）；遭遇 401/429 時自動刷新 Crumb 或觸發熔斷降級不阻塞首屏。
- [ ] 美股個股與美股 ETF（如 `VT`, `SPY`, `QQQ`, `VOO`, `SCHD`）之歷史除息紀錄正確寫入 `corporate_action_calendar` (`market='US'`) 並隨歷史端點回傳。
- [ ] 湖倉載入器將 `usFundamentals` 完整映射至 `valuation`、`us13fData` 與 `etfNav`/`etfMeta`，全鏈路通過單元與整合測試。
