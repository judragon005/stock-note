# 02 — 標的註冊表種子入庫與 30ms 模糊搜尋索引 (Symbols Universe Seed & Fast Autocomplete)

**What to build:**
實作 `scripts/market-sync/seed-symbols-universe.cjs` 與搜尋查詢模組。
將專案既有之台股全市場 2,400+ 檔標的（含上市櫃普通股與 ETF）及美股主要市場 1,500 檔主流標的種子資料匯入 `symbols_meta` 資料表。
建立針對 `symbol` 與 `name` 的覆蓋索引 (`idx_symbols_lookup`)。
提供極速模糊搜尋函式 `searchSymbolsMeta(query: string, limit?: number): SymbolMeta[]`，支援中文名稱、代碼前綴匹配與大小寫不敏感查詢，響應時間在 30 毫秒以內。

**Blocked by:** 01 — SQLite 資料庫引擎連線層與核心 Schema 初始化

**Status:** completed

- [x] 實作 `upsertSymbolsMeta(symbols: SymbolMeta[])` 批次寫入種子名單。
- [x] 匯入台股 2,400+ 檔與美股 1,500+ 檔基礎中英文代碼名稱。
- [x] 實作 `searchSymbolsMeta` 支援「台積」、「2330」、「NVDA」、「輝達」等模糊關鍵字查詢。
- [x] 驗證查詢延遲小於 30ms。
- [x] 單元測試 `src/engine/symbolsUniverse.test.ts` 驗證種子寫入完整性與模糊檢索準確率 100% 綠燈。
