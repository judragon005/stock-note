# 01 — ETF 全分組淨值入庫解析器修復與實庫補齊 (`etf_daily_nav`)

**Parent:** #590 (Spec 0238)
**What to build:** 修復證交所 `all_etf.txt` 僅讀取 `rawData.a1[0].msgArray` 的解析漏洞，改為遍歷 `rawData.a1` 所有投信與資產類別分組（`a1[0..N]`），並相容上櫃 ETF，使 `0050`、`0056`、`00878`、`00679B` 等全市場 200+ 檔台股 ETF 的收盤價、淨值 (`NAV`) 與折溢價率完整寫入本地 SQLite `etf_daily_nav`。
**Blocked by:** None — can start immediately
**Status:** ready-for-agent

- [ ] `parseTwseEtfNavResponse` 遍歷 `rawData.a1` 所有分組元素，正確提取不同分組中的 ETF（含 `0050`、`0056`、`00878` 等）。
- [ ] `syncFuturesOiAndEtfNav.test.ts` 新增多分組 `a1[0..N]` 測試案例並 100% 通過。
- [ ] 實際執行單次 ETF 淨值同步後，本地 `.scratch/market-cache/market_history.db` 之 `etf_daily_nav` 筆數 `>= 150` 檔且包含 `0050`。
