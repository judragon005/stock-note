# 04 — 系統整合、時光機快照防呆、全量 TDD 驗證與技術債結案

**What to build:**
1. **系統整合 (`App.tsx`)**：
   - 升級 `App.tsx` 檔案上傳入口對接 `EnhancedImportModal`。
   - 執行覆蓋匯入前自動呼叫 `createSystemSnapshot` 建立防呆還原點。
   - 匯入成功後自動同步寫入 IndexedDB 並觸發全域資產重新計算。
2. **全量測試與回歸驗證**：
   - 確保所有新撰寫之單元測試與既有測試 100% 綠燈通過 (`npm test`)。
   - TypeScript 編譯 0 錯誤 (`npm run build`)。
3. **文檔與技術債看板同步**：
   - 更新 `docs/debts/README.md`，將技術債 #0005 狀態更新為 `RESOLVED`。
   - 建立 `docs/adr/0063-enhanced-csv-column-mapping-importer.md`。

**Blocked by:** Issue 01, Issue 02, Issue 03

**Status:** completed
**Triage:** `ready-for-agent`

- [x] 在 `App.tsx` 中整合 `EnhancedImportModal`
- [x] 執行全量 `npm test` 與 `npm run build`
- [x] 同步更新 `docs/debts/README.md` 與 ADR
