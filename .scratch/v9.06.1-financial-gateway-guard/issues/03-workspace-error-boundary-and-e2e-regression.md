# 03 — 故障隔離安全氣囊與全量回歸測試 (Workspace Error Boundary & E2E Regression)

**What to build:**
建立無外部依賴的標準 React `<WorkspaceErrorBoundary>`（約 25 行），包覆在 `src/App.tsx` 活頁切換處，提供金融軟體核心底座之故障隔離機制；並於 `src/components/WarRoomWorkspace.test.tsx` 補齊全量回歸與自愈測試，執行 `npm test` 與 `npm run build` 確認 100% 綠燈與 0 TypeScript 錯誤。

**Blocked by:** 02 — 前端狀態海關淨化與標量渲染守護 (Frontend State Sanitation & Primitive Guard)

**Status:** ready-for-agent

- [ ] 實作 `src/components/common/WorkspaceErrorBoundary.tsx` 並於 `src/App.tsx` 活頁外圍包覆。
- [ ] 於 `src/components/WarRoomWorkspace.test.tsx` 驗證被行情物件污染之 LocalStorage 快照能自動修復並乾淨渲染。
- [ ] `npm test`（1,972+ 測試）100% 通過，`npm run build` 打包 0 錯誤。

