# 01 — 擴充美股全市場標的種子庫至 1,500+ 檔 (Expand US Symbols Universe Seed)

**What to build:**
1. 修改 `scripts/market-sync/seed-symbols-universe.cjs`：
   - 引入 `src/data/stockDictionary.ts` 中的 `STATIC_US_STOCKS`（約 600+ 檔 S&P 500 與主流 ETF）。
   - 加入 S&P 1500 / NASDAQ 100 / 熱門成長股與主題 ETF 之美股標的種子名單，擴充為 `FULL_US_SEED_UNIVERSE`（1,500+ 檔）。
   - 增強 `seedDefaultSymbolsUniverse()`，支援將 1,500+ 檔美股元資料批次事務寫入 SQLite `symbols_meta` 資料表。
2. 提供獨立驗證指令 `node scripts/market-sync/seed-symbols-universe.cjs`，確保入庫 1,500+ 檔且不重複。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 整合美股標的種子清單，確保覆蓋主流權值、ETF 與成長股（>= 1,500 檔）。
- [x] 實作批次事務寫入 `symbols_meta`，包含 symbol、name、market('US')、exchange、type、status。
- [x] 撰寫單元測試驗證種子清單數量與入庫唯一約束 (UPSERT 冪等性)。
