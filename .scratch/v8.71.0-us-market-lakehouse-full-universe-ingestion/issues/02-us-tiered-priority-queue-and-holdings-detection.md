# 02 — 三層動態優先級隊列與本地持股偵測器 (US Tiered Priority Queue & Holdings Detection)

**What to build:**
1. 建立或增補優先級隊列建構邏輯（可置於 `scripts/market-sync/sync-us-market.cjs` 或核心模組）：
   - **Tier 0 (即時持股與自選名單)**：自動掃描讀取本地已保存的使用者交易數據（例如 IndexedDB 導出快取或本地持股記錄）與自選名單，強制置頂於隊列最前方。
   - **Tier 1 (核心指數與大型藍籌，44 檔)**：原 `US_TIER_1_CORE`（VOO, SPY, QQQ, AAPL 等），排於第二位階。
   - **Tier 2 (全市場擴充標的)**：其餘約 1,400+ 檔標的接續於後。
2. 保證標的去重 (Deduplication)，且保有 Tier 0 ➔ Tier 1 ➔ Tier 2 的絕對優先權。

**Blocked by:** Ticket 01

**Status:** completed

- [x] 實作 `buildPrioritizedUsUniverse(holdingsSymbols, customWatchlist)` 函式。
- [x] 驗證持股與自選標的能精準置頂於隊列最前列。
- [x] 撰寫單元測試覆蓋多來源重疊與去重情境。
