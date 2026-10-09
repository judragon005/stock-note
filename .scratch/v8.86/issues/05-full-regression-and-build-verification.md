# Ticket 05: 全面端到端迴歸測試與 TypeScript 零錯誤建置驗證

## 關聯規格
- Spec: `docs/specs/0174-ai-force-dashboard-visual-master-layout-and-tooltip-spec.md` (第 5 節 Testing Strategy)

## 問題背景
本次重構涉及 4 個主要元件（`InstitutionalFlowCard`、`TermTooltip`、`VolumeProfileCard`、`AiForceDashboardView`）以及其關聯之 CSS/網格容器。必須在本地完成全量單元測試、型別檢查與生產打包，防禦任何隱藏的 TypeScript 錯誤或迴歸破壞。

## 任務細節
1. 執行全量單元測試：
   - 執行 `npm test`，確保所有測試（含既有 100+ 測試套件）100% 綠燈通過。
   - 重點檢查：
     - `InstitutionalFlowCard.test.ts`
     - `VolumeProfileCard.test.ts`
     - `TermTooltip.test.tsx`
     - `fullSpectrumAiForceE2E.test.ts`
2. 執行生產環境建置：
   - 執行 `npm run build`，確保 `tsc` 型別檢查 0 錯誤，Vite 打包順利完成。
3. 程式碼乾淨度檢驗：
   - 驗證無遺留之 `console.log`、暫存 debug 代碼或未使用的 import。

## 驗收標準
- [x] `npm test` 100% 通過（0 failed，25 files，141 tests）。
- [x] `npm run build` 0 錯誤完成打包。
- [x] 戰情室各視圖功能完全正常，無破版或佈局坍塌。

