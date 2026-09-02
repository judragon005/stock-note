# 任務 01: 實質已交割可用現金隔離與在途待交割款計算

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: Engine / Cash Accounting
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0026 (AC-1, AC-2)

## 任務描述
在 `calculateAccountBalances` 引擎中加入交割與生效日過濾，僅累計已到期且已交割之款項，未來尚未發放的股息與 T+2/T+1 待交割在途買進款不提前計入可用現金餘額，並於交割卡片上展示黃色「在途待交割」標籤與預估交割後餘額。

## 驗收標準 (Acceptance Criteria)
- [x] `AccountBalanceSummary` 擴充 `pendingSettlementAmount` 與 `projectedBalance`。
- [x] `calculateAccountBalances` 僅累計 `date <= todayStr` 且 `settlementStatus !== 'PENDING'` 之款項。
- [x] 在券商交割戶卡片上展示「在途待交割」標籤與「預估交割後餘額」。
