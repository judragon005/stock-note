# 任務 03: 預扣稅費專屬徽章正名與分類篩選支援

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: UI / Component
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0026 (AC-4)

## 任務描述
在 `CashLedgerWorkspace.tsx` 的 `renderCategoryBadge` 中，將 `TAX` 類別或備註包含預扣稅之流水項目，正名為玫瑰粉專屬徽章「🧾 預扣稅費」，並納入頂部分類篩選。

## 驗收標準 (Acceptance Criteria)
- [x] 預扣稅相關項目渲染為玫瑰粉色「🧾 預扣稅費」徽章。
- [x] 頂部「規費/利息/稅費」分類篩選正確過濾出預扣稅項目。
