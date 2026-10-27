# Ticket 03: WarRoomWorkspace 快速校準 Modal 抽取與狀態自治

* **關聯技術債：** [0054](../../docs/debts/0054-war-room-quick-calibration-modal-decomposition.md)
* **目標檔案：**
  - `src/components/warRoom/MacroQuickCalibrationModal.tsx`
  - `src/components/WarRoomWorkspace.tsx`
* **狀態：** `DONE`

## 工作項目
1. 建立 `src/components/warRoom/MacroQuickCalibrationModal.tsx`。
2. 定義 `MacroCalibrationFormState`，表單 8 個欄位在元件內部以單一狀態或內部 useState 自治管理。
3. 外部僅傳入 `isOpen`, `onClose`, `initialSnapshot`, `onSave`。
4. `WarRoomWorkspace.tsx` 移除 8 個頂層 State 與 200 行表單，消除無效重繪。
