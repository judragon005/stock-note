# 任務 02: 同日金流雙向動態時間軸排序優化

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: UI / UX Sorting
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0026 (AC-3)

## 任務描述
在 `CashLedgerWorkspace.tsx` 的 `filteredTransactions` 排序中，針對同日交易依據 `sortOrder`（新 ➔ 舊 或 舊 ➔ 新）動態切換優先級。在「新 ➔ 舊」模式下，後發生的交割扣款排在上方，先發生的股息入帳排在下方。

## 驗收標準 (Acceptance Criteria)
- [x] 在「新 ➔ 舊 (DESC)」模式下：買進交割扣款排在股息入帳上方。
- [x] 在「舊 ➔ 新 (ASC)」模式下：股息入帳排在買進交割扣款上方。
