# ADR 0059：本地儲存檢測中心雙軌容錯韌性升級與 0 筆計數盲區修復 (Local Storage Inspector Dual-Track Resilience)

## 狀態 (Status)
已採納 (Accepted) - 2026-09-01

## 脈絡 (Context)
在設定中心的「本地數據與儲存空間總覽 (Local Storage Inspector)」模組中，曾發生上方檢測卡片顯示「0 筆/0 份」，而導覽列與時光機列表卻存在真實數據的矛盾。

經由底層機制剖析，確立兩大技術破口：
1. `Promise.all` 對 10 個 IndexedDB Store 進行並行查詢時，只要任一表（如新版本加入的 `corporateActions`）不存在，即導致整筆 Promise 拒絕並坍縮為全空陣列。
2. UI 層使用 `stats?.coreAssets.totalTrades.toLocaleString() ?? trades.length`，當數字為 `0` 時轉為非 Nullish 的字串 `"0"`，使 Props 兜底邏輯徹底失效。

## 決策 (Decision)
1. **版本自動遷移 (`DB_VERSION = 2`)**：升級 IndexedDB 版本以在開啟時自動建立所有必要 Stores。
2. **底層事務隔離與安全查詢 (`SafeGetAll`)**：
   - 在底層各 CRUD 函式中加入 `db.objectStoreNames.contains(storeName)` 存在性防禦。
   - `getLocalStorageInspectionStats()` 內使用 `SafeGetAll` 隔離各表查詢。
3. **雙軌自動回退 (Dual-Track Fallback Reconciliation)**：當 IndexedDB 統計為 0 筆時，自動雙向讀取 LocalStorage 原生資料作為安全兜底。
4. **顯式 UI 取值判斷**：改為顯式三元運算子與真值判定，避免字串 `"0"` 阻斷真實數據呈現。

## 後果 (Consequences)
- **正面效益**：
  - 徹底解決數據源脫鉤與卡片歸零問題。
  - 即使使用者歷史資料庫缺漏部分表結構，也能優雅降級並正常讀取其他數據。
  - 達成 100% 測試覆蓋率與 TypeScript 零錯誤。
- **維護代價**：
  - 日後新增 IndexedDB ObjectStore 時，需同步更新 `DB_VERSION` 與 `SafeGetAll` 映射清單。
