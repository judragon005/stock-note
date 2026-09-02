# Ticket 04: 儲存適配層升級與 React 非同步生命週期整合 (Storage Adapter & Async Lifecycle)

## 需求說明
- 重構 `src/utils/storage.ts`：建立基於 IndexedDB 的非同步讀寫介面，相容降級機制。
- 在「CSV 批量匯入」與「重置/清空」前自動呼叫 `createSystemSnapshot`。
- 重構 `src/App.tsx`：
  - 新增 `isInitializing` 狀態與優雅全域載入骨架。
  - 在 `useEffect` 初始載入時非同步呼叫 `initializeStorage()`，完成遷移並一次性載入所有 State。
  - 保留 React 內部記憶體操作零延遲，在狀態變更時非同步背景持久化至 IndexedDB。

**Status:** completed

- [x] 改造 `src/utils/storage.ts` 支援 IndexedDB 非同步寫入與快照自動觸發。
- [x] 改造 `src/App.tsx` 整合非同步載入骨架與狀態初始化。
- [x] 確保 CSV 匯入與清空操作前自動產生快照。
- [x] 既有單元測試與功能驗證通過。
