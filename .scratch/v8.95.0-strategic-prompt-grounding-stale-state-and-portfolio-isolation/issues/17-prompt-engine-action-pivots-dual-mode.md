# Ticket 17: strategicPromptEngine 重構 <action_pivots>：持倉模式輸出防守停損/移動停利；空手模式輸出建倉風報比與回測支撐

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 strategicPromptEngine 重構 <action_pivots>：持倉模式輸出防守停損/移動停利；空手模式輸出建倉風報比與回測支撐。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
