# Ticket 08: aiForcePromptAdapter 拆分最新單日買賣超 (1D) 與日 K 累積之近 20 日三大法人買賣超 (20D)

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 aiForcePromptAdapter 拆分最新單日買賣超 (1D) 與日 K 累積之近 20 日三大法人買賣超 (20D)。

## 2. 修改範圍
* `src/engine/aiForcePromptAdapter.ts`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
