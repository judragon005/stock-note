# Issue 02: 檢測統計指標 SafeGetAll 隔離查詢與 LocalStorage 雙軌容錯回退

- **狀態**：`CLOSED`
- **關聯規格**：[PRD 0059 §2.1, §2.2](file:///d:/APP/股票紀錄/docs/specs/0059-local-storage-inspector-dual-track-resilience-and-zero-count-fix-spec.md)
- **影響範圍**：`src/utils/db.ts`

---

## 1. 任務背景與問題 (Problem Statement)
- `getLocalStorageInspectionStats()` 過去使用 `Promise.all` 批次查詢 10 個 ObjectStore，單一表發生異常時導致全盤 10 表變數坍縮為空陣列（計數為 0）。
- 當 IndexedDB 剛建立或尚未同步時，完全忽視 LocalStorage 中既有之個人資產數據，無法自我修復。

---

## 2. 實作變更 (Implementation Changes)
- 導入 `safeGetAll` 獨立安全讀取機制，隔離各 Store 查詢錯誤。
- 建立 LocalStorage 雙軌容錯回退機制（Fallback Reconciliation）：若 IndexedDB 表中資料為空（長度為 0），自動回退讀取 LocalStorage 對應鍵值資料（`trades`, `brokerAccounts`, `cashTransactions`, `loanRecords`, `historicalPrices`, `historicalFx`, `priceMetadata`, `corporateActions`）。

---

## 3. 驗收標準 (Acceptance Criteria)
- [x] 單一 ObjectStore 查詢失敗時，其餘 9 個 Store 正常採集指標。
- [x] 在 IndexedDB 為空但 LocalStorage 存有資料時，`getLocalStorageInspectionStats()` 準確回報 LocalStorage 中的真實交易與帳本筆數。
