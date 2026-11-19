# 07 — SEC EDGAR 本地代理、全美股動態 CIK 解析與美股 10-Q/10-K 季營收貫通

**Parent:** #592 (Spec 0239)
**What to build:** 於本地市場中介層建置 SEC EDGAR 伺服器端代理路由（伺服器端注入合規 `User-Agent` 並執行 $\le 10\text{ req/s}$ 限速，徹底消除瀏覽器 Forbidden Header 違規），搭配本地快取之 SEC 官方全美股 `company_tickers.json` 動態解析任意美股代碼之 CIK（取代原僅 18 檔的硬編碼字典，並支援 `BRK.B`/`BRK-B`）；與 FMP/Finnhub 金鑰池構成備援，將 `financial_statements_quarterly` 近 8 季美股營收、毛利率、營益率與 EPS 完整串接至戰情室 Card 20（美股季營收模式）與 Card 21。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用, 06 — 美股基本面與 13F 湖倉表 (us_fundamentals_daily)、Yahoo quoteSummary Crumb 聚合與美股歷史配息
**Status:** ready-for-agent

- [ ] 前端 SEC EDGAR 請求改經本地中介層代理，不再於瀏覽器直設 `User-Agent` / `Accept-Encoding` 違規標頭；伺服器端嚴格限速 $\le 10\text{ req/s}$。
- [ ] 動態 CIK 解析器可解析硬編碼 18 檔以外的任意美股（如 `AMD`, `JPM`, `LLY`, `BRK.B`）並將結果快取於本地。
- [ ] 美股個股抓取到的近 8 季 10-Q/10-K 財報正確寫入 `financial_statements_quarterly` 並計算各季 YoY 成長率，於 `AiForceDashboardView` 完整餵入報表引擎之季營收欄位與估值財報欄位。
- [ ] 當 SEC EDGAR 與本地快取均查無資料時平滑降級至 FMP/Finnhub 金鑰池或 Honest Empty State，不拋出未處理例外。
