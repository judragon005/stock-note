# Ticket 01: 原生 Promise IndexedDB 核心驅動引擎 (DB Engine Core)

## 需求說明
- 建立 `src/utils/db.ts`，以原生 IndexedDB API 封裝 Promise 驅動層（0 外部套件依賴）。
- 資料庫名稱 `StockTrackerDB`（版本 `v1`），建立 9 大 Object Stores（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `snapshots`, `settings`）。
- 提供單筆 `get`, `put`, `delete`、批量 `getAll`, `batchPut` 與事務交易封裝。
- 撰寫 `src/utils/db.test.ts` 驗證資料庫建立、CRUD 與事務回滾。

**Status:** completed

- [x] 實作 `src/utils/db.ts` 核心資料庫驅動與 9 大 Stores 初始化。
- [x] 實作泛型 `get`, `put`, `delete`, `getAll`, `batchPut`, `transaction` 介面。
- [x] 完成 `src/utils/db.test.ts` 單元測試覆蓋。
