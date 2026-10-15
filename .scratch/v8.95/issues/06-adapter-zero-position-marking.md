# Ticket 06: aiForcePromptAdapter 實作空手標的自動標註為 ZERO_POSITION，指令嚴禁發布停損命令

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 aiForcePromptAdapter 實作空手標的自動標註為 ZERO_POSITION，指令嚴禁發布停損命令。

## 2. 修改範圍
* `src/engine/aiForcePromptAdapter.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
