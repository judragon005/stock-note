# Ticket 15: aiForcePromptAdapter 注入當日台股 ±10% 漲跌停價格、處置/注意股票狀態與當沖比率

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 aiForcePromptAdapter 注入當日台股 ±10% 漲跌停價格、處置/注意股票狀態與當沖比率。

## 2. 修改範圍
* `src/engine/aiForcePromptAdapter.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
