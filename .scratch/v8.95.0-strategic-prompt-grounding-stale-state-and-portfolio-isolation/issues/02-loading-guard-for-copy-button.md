# Ticket 02: WarRoomPromptCard 接入 isLoading 與 isDataPending 狀態，加載期間禁用複製按鈕並顯示「同步校準中」

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 WarRoomPromptCard 接入 isLoading 與 isDataPending 狀態，加載期間禁用複製按鈕並顯示「同步校準中」。

## 2. 修改範圍
* `src/components/aiForceDashboard/WarRoomPromptCard.tsx`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
