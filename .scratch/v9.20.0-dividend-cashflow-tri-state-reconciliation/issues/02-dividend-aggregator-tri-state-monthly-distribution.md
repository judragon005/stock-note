# 02 — 現金流三態時序聚合與月度分佈擴展

**Parent:** #516

**What to build:**
擴充 `aggregateDividendReport` 底層月度資料結構，使其包含待入帳應收股利金額（`pendingNetTWD`）與筆數（`pendingCount`）。遍歷 `scopedReceivables` 中狀態為 `PENDING_PAYMENT` 或 `OVERDUE` 者，按其預估入帳月累加，使聚合報表完整掌握「實領歷史」與「待入帳應收」雙軌資料。

**Blocked by:** 01 — 預估現金流引擎發放月精準對齊與 8 月硬編碼解除

**Status:** ready-for-agent

- [x] `monthlyDistribution` 型別新增 `pendingNetTWD` 與 `pendingCount`
- [x] 遍歷未到期之 `scopedReceivables`，依 `payDate` 歸屬加總至月度分佈
- [x] 確保 `currentYearDividendsTWD` 等已實現統計口徑不受影響，維持會計真實性
- [x] 單元測試驗證 11 月、12 月包含待入帳金額與筆數

