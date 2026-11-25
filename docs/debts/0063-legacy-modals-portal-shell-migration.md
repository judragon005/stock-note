# Debt 0063: 全站其餘 23 顆有效既有彈窗漸進遷移至 ModalShell 頂層 Portal 原語

- **優先級 (Priority)**: `P3`
- **狀態 (Status)**: `OPEN`
- **發現來源**: Spec 0245 (`/grill-with-docs` 與全站彈窗審計，Issue `#605`)；**Spec 0247 全量法醫複審補齊子目錄與內嵌彈窗盤點（實測共 23 顆有效未遷移彈窗 + 1 顆 Dead Code `ImportModal.tsx`）**
- **標籤**: `Refactor` · `UI` · `Accessibility` · `ModalShell` · `Portal`
- **預計觸發時機**: 後續迭代觸及各彈窗功能變更時採「童子軍原則」漸進遷移，或於 UI 無障礙治理專題批次清償

---

## 背景與現況

於 Spec 0245 初次盤點根目錄 15 顆 `*Modal*.tsx` 元件，並於 Spec 0247 全量法醫複審補齊子目錄與內嵌彈窗盤點（實測共 **23 顆有效未遷移彈窗** + 1 顆 Dead Code `ImportModal.tsx`）：

- `ExportDatabaseModal` 已於 Spec 0245 (ADR 0245) 完成遷移至統一原語 `src/components/common/ModalShell.tsx`（`createPortal(document.body)` + `.modal-overlay` + `glass-card` + `Escape` + 遮罩點擊關閉 + `body` 捲動鎖定 + `role="dialog" aria-modal="true"`），並於 CI 植入靜態守門禁止 `.modal-backdrop`。
- 其餘 **23 顆有效既有彈窗**（含下方初次盤點之 13 顆有效根目錄彈窗與子目錄／內嵌彈窗，不含 Dead Code `ImportModal.tsx`）仍各自維持異質寫法（`.modal-overlay`、inline `position: fixed`、未安裝幽靈 Tailwind `fixed inset-0`），且多數缺乏 `createPortal`、`aria-modal="true"` 或 `Escape` 鍵盤關閉（初版根目錄 14 檔清單如下）：
  1. `BrokerAccountsModal.tsx`
  2. `CashTransactionModal.tsx`
  3. `CorporateActionScannerModal.tsx`
  4. `EnhancedImportModal.tsx`
  5. `FrictionCenterModal.tsx`
  6. `ImportModal.tsx`
  7. `LoanModal.tsx`
  8. `LookThroughDetailModal.tsx`
  9. `LotsBreakdownModal.tsx`
  10. `MarginStressModal.tsx`
  11. `OmniTechnicalInspectorModal.tsx`
  12. `ReconciliationModal.tsx`
  13. `TradeModal.tsx`
  14. `XirrDetailModal.tsx`

## 建議演進方向

1. 依模組觸及順序，將上述彈窗外層遮罩與容器逐步替換為 `ModalShell`，統一視口層疊隔離、鍵盤 `Escape` 關閉與無障礙 `aria-modal` 屬性。
2. 遷移全數完成後，於 `architecturalFitnessGuard.test.ts` 升級靜態不變量為「所有 `*Modal*.tsx` 須透過 `ModalShell` 掛載」，正式關閉本技術債。
