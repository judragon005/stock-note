# Ticket 14: 整合 industryGate.ts，自動標註景氣循環股 (is_cyclical="true")，黑帽思考帽注入高峰估值陷阱質詢

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 整合 industryGate.ts，自動標註景氣循環股 (is_cyclical="true")，黑帽思考帽注入高峰估值陷阱質詢。

## 2. 修改範圍
* `src/engine/strategicPromptEngine.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
