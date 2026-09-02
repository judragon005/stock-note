# 任務 04: 質押設質三大規費計入還款總額與黑底卡片深度整併

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: Engine / UI Integration
- **優先級**: P0 (Phase 2)
- **對應 PRD**: SPEC-0026 (AC-5)

## 任務描述
在 `calculateLoanInterestAndPayoff` 中修正規費重複累加問題，還款總額公式精準為「本金 + 利息 + 規費」，並在 `CashLedgerWorkspace.tsx` 將設質三大規費移入利息與還款總額所在的黑色卡片內。

## 驗收標準 (Acceptance Criteria)
- [x] `calculateLoanInterestAndPayoff` 精準計算 `pledgeFees`，杜絕重複加總。
- [x] 還款總額驗算無誤（如 $495,000 + $1,519 + $54 = $496,573）。
- [x] 設質三大規費整併至借貸黑底卡片內部。
