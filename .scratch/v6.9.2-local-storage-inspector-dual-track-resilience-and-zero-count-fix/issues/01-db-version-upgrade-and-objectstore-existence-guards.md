# Issue 01: IndexedDB 版本升級至 v2 與 ObjectStore 存在性檢查防禦

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0059 §2.2](file:///d:/APP/股票紀錄/docs/specs/0059-local-storage-inspector-dual-track-resilience-and-zero-count-fix-spec.md)
- **影響範圍**：`src/utils/db.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- 舊版客戶端在 `DB_VERSION = 1` 下建立資料庫後，後續加入之新 ObjectStore（如 `corporateActions`、`settings` 等）無法觸發 `onupgradeneeded` 建立。
- 當系統底層呼叫 `dbGetAll` / `dbGet` / `dbPut` / `dbClear` 時，會觸發 `NotFoundError` 導致非預期之中斷。

---

## 2. 實作變更 (Implementation Changes)
- 將 `DB_VERSION` 升級為 `2`，確保開啟時自動補齊缺失之 ObjectStore。
- 在 `dbGetAll`、`dbGet`、`dbPut`、`dbBatchPut`、`dbDelete`、`dbClear` 底層函式中，全部加入 `if (!db.objectStoreNames.contains(storeName))` 檢查與 `try/catch` 事務隔離防禦。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] `DB_VERSION` 定義為 `2`。
- [x] 當查詢不存在的 Store 時，`dbGetAll` 安全回傳空陣列 `[]`，`dbGet` 回傳 `undefined`，不拋出未捕獲錯誤。
