# Ticket 02: 無損平滑雙重保險資料遷移演算法 (Non-Destructive Migration)

## 需求說明
- 在 `src/utils/db.ts` 或 `src/utils/storageMigration.ts` 實作自動遷移機制 `migrateFromLocalStorageIfNeeded()`。
- App 啟動時偵測 IndexedDB 是否已標記 `migration_completed`。
- 若未遷移，讀取 `localStorage` 既有 12 大鍵值（`trades`, `broker_accounts`, `cash_transactions`, `loans`, `historical_prices`, `historical_fx`, `price_metadata`, `api_keys`, `accounting_view` 等）並無損寫入 IndexedDB。
- 遷移後保留 `localStorage` 作為冷備份，並在 IndexedDB 寫入 `migration_completed = true`。
- 全新使用者自動寫入 `DEFAULT_TRADES` 與預設券商帳戶。

**Status:** completed

- [x] 實作 `migrateFromLocalStorageIfNeeded` 遷移邏輯。
- [x] 驗證既有資料無損轉移與冷備份保留。
- [x] 驗證全新環境初始化預設資料。
- [x] 撰寫單元測試覆蓋各種遷移邊界情境。
