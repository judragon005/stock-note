# 001 — indexeddb-storage-inspection-api-and-metrics-collector

**What to build:**
在 `src/utils/db.ts` 中封裝底層儲存統計與檢測 API (`getLocalStorageInspectionStats`)，精確採集各 ObjectStore（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`, `snapshots`, `settings`）的筆數、標的數與交易時間區間，並整合 `navigator.storage.estimate()` 取得磁碟配額與使用量；同時提供細粒度快取清除函式 (`clearHistoricalPricesCache`, `clearHistoricalFxCache`, `clearPriceMetadataCache`, `clearCorporateActionsCache`)，並於 `src/utils/db.test.ts` 建立完備的單元測試。

**Blocked by:** None — can start immediately

**Status:** closed

- [x] 在 `src/types/stock.ts` 或 `src/types/storage.ts` 定義 `LocalStorageInspectionStats` 介面結構
- [x] 在 `src/utils/db.ts` 實作 `getLocalStorageInspectionStats()` 異步採集函式（含 `navigator.storage.estimate()` 安全降級）
- [x] 實作單項快取清除函式：`clearHistoricalPricesCache`, `clearHistoricalFxCache`, `clearPriceMetadataCache`, `clearCorporateActionsCache`
- [x] 在 `src/utils/db.test.ts` 撰寫單元測試，驗證各 Store 計數統計、時間區間萃取，以及快取清除不影響核心交易與交割帳戶
