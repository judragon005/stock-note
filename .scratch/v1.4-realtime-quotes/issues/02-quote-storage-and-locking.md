# 02 — 報價狀態管理、持久化快取與自訂價格鎖定防禦 (Ticket 2)

**GitHub Issue:** [#48](https://github.com/judragon003/-/issues/48)

**What to build:**
擴充 `src/types/stock.ts` 與 `src/utils/storage.ts`。新增 `PriceQuoteStatus`、`PriceQuote`、`PriceMetadataStore` 型別定義；實作報價中繼資料與鎖定標的清單的 localStorage 讀寫函式（`loadPriceMetadataFromStorage`、`savePriceMetadataToStorage`、`getLockedSymbols`、`isSymbolLocked`、`setSymbolLock`、`updateQuoteInStorage`）；撰寫單元測試覆蓋狀態持久化與鎖定狀態維護。

**Blocked by:** 01-price-fetcher-engine

**Status:** completed

- [x] 擴充 `types/stock.ts` 定義 `PriceQuoteStatus`、`PriceQuote` 與 `PriceMetadataStore`。
- [x] 實作 `loadPriceMetadataFromStorage` 與 `savePriceMetadataToStorage` 本地持久化存取。
- [x] 實作 `getLockedSymbols`、`isSymbolLocked` 與 `setSymbolLock` 自訂鎖定管理。
- [x] 實作 `updateQuoteInStorage` 支援單檔報價安全更新。
- [x] 撰寫 `src/utils/storage.test.ts` 新增 Seam 5 測試案例，共 15 項測試 100% 通過。
