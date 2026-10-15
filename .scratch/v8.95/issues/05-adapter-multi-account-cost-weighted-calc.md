# Ticket 05: aiForcePromptAdapter 實作跨帳戶多筆持倉加權成本 (avgCost)、保本價 (breakevenPrice) 與未實現損益率計算

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 aiForcePromptAdapter 實作跨帳戶多筆持倉加權成本 (avgCost)、保本價 (breakevenPrice) 與未實現損益率計算。

## 2. 修改範圍
* `src/engine/aiForcePromptAdapter.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
