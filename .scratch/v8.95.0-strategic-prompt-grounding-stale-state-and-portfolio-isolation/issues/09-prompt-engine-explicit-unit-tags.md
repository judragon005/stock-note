# Ticket 09: strategicPromptEngine 為所有籌碼與成交量標籤強制注入 unit="張"、unit="股" 與 unit="億元"

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 strategicPromptEngine 為所有籌碼與成交量標籤強制注入 unit="張"、unit="股" 與 unit="億元"。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
