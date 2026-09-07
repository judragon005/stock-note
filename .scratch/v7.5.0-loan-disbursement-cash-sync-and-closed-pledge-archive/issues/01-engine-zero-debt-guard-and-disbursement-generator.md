---
title: "Ticket 01: 核心計算引擎零本金防禦、結清規費清除與撥款入帳流水生成函式"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `cashLedgerEngine.ts` 中修復維持率與結清計算邊界條件，並提供生成借款撥款金流之純函數，編寫 TDD 單元測試。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 修復 `calculatePledgeMaintenanceRatio`：當 `loan.principal <= 0` 時，維持率不判定為斷頭，`status` 為 `'SAFE'`，`isMarginCall: false`，維持率回傳 `Infinity` 或特定安全標記。
- [x] 2. 修復 `calculateLoanInterestAndPayoff`：當 `loan.principal <= 0` 且無計息天數時，`totalPayoffAmount` 與應付規費歸零。
- [x] 3. 新增 `createLoanDisbursementTransaction` 輔助函式，支援依據 `LoanRecord` 產生標準化 `LOAN_DISBURSEMENT` 入帳流水。
- [x] 4. 於 `src/engine/cashLedgerEngine.test.ts` 建立上述邊界之完整單元測試並 100% 通過。
