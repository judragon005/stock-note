# 07 — 台股注意股票與處置股票狀態標記管線 (TW Attention & Disposition Stock Tagger)

**What to build:**
實作 `scripts/market-sync/tag-tw-stock-status.cjs`。
抓取 TWSE/TPEx 官方每日盤後公告之「公布注意股票」與「公布處置股票（含分盤撮合 5 分鐘、20 分鐘）」及全額交割股票清單。
自動將命中的標的更新至 `symbols_meta.status` 欄位（枚舉值：`NORMAL` | `ATTENTION` | `DISPOSITION` | `FULL_CASH`）。
解除處置或注意之標的自動還原為 `NORMAL`。

**Blocked by:** 02 — 標的註冊表種子入庫與 30ms 模糊搜尋索引

**Status:** completed

- [x] 支援解析 TWSE 與 TPEx 官方注意股票公告。
- [x] 支援解析 TWSE 與 TPEx 官方處置股票公告。
- [x] 準確批次更新 `symbols_meta.status`，未在受處置名單內的標的確保維持或重置為 `NORMAL`。
- [x] 提供查詢介面 `getStockStatus(symbol: string): Promise<StockStatus>`。
- [x] 單元測試 `src/engine/tagTwStockStatus.test.ts` 驗證處置股命中、狀態切換與復原行為 100% 通過。
