# 01 — 同步腳本路徑錨定 (廢除 process.cwd)

**What to build:** 
在 `sync-tw-market.cjs` 與 `sync-us-market.cjs` 中，將所有快取存取路徑（`tw_market_summary.json`、`us_market_summary.json` 等）改為以 `__dirname` 絕對錨定專案根目錄，徹底解決 Windows 工作排程器因 CWD 漂移至 `C:\Windows\System32` 導致背景寫入快取失敗的問題。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 移除 `path.join(process.cwd(), 'public/market-cache', ...)`。
- [ ] 替換為以 `__dirname` 定位專案根目錄之絕對路徑。
- [ ] 在任意非專案目錄執行腳本時，檔案均能精確寫入專案 `public/market-cache/`。
