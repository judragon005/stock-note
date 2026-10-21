# Ticket 01: AiForceDashboardView 標的切換時立即原子重置 marketBar 與 chipsSummary，杜絕 ...prev 幽靈數據殘留

## 1. 任務目標
針對 Spec 0182 規劃之要求，落實 AiForceDashboardView 標的切換時立即原子重置 marketBar 與 chipsSummary，杜絕 ...prev 幽靈數據殘留。

## 2. 修改範圍
* `src/components/aiForceDashboard/AiForceDashboardView.tsx`

## 3. 驗收標準 (AC)
- [ ] 依據 Spec 0182 規範完成程式碼實現。
- [ ] 單元測試通過，無 TypeScript 型別錯誤。
