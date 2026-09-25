# 子任務 03: 質押借貸 FULL_PAYOFF 全額結清統一委託 applyDebtRepayment 引擎 (Debt #0036 / Issue #25)

- **狀態**：`CLOSED` (已完成)
- **所屬 Epic**：[Ticket #0139](0139.md)
- **關聯技術債**：[Debt #0036](../../../docs/debts/0036-full-payoff-unified-engine-refactor.md)
- **關聯 GitHub Issue**：[Issue #25](https://github.com/judragon005/stock-note/issues/25)

## 任務細項
1. 檢驗 `applyDebtRepayment` 在全額還款時（`repaymentAmount >= metrics.totalPayoffAmount`）之行為：
   - 規費沖抵：`pledgeFeesToPay` 全額沖抵，`feesPaid = metrics.pledgeFees`。
   - 利息沖償：`metrics.accruedInterest` 全額沖償，`interestPaid = metrics.accruedInterest`。
   - 本金沖銷：剩餘金額全額沖銷本金，`principalPaid = loan.principal`，`remainingPrincipal = 0`。
   - 拆分流水：自動依序產生 `WIRE_FEE`、`FINANCING_FEE`、`LOAN_REPAYMENT`。
   - 合約更新：合約規費清零，繳息日更新為 `repaymentDate`，`closedDate` 自動標記。
2. 重構 `src/components/CashLedgerWorkspace.tsx` L471~L544：
   - 移除舊版手工拼裝之 3 筆流水與手工狀態更新。
   - 改為計算應付結清總額後，直接委託 `applyDebtRepayment` 執行沖償。
   - 將回傳之 `updatedLoan` 直接標記結清日，並更新帳本與合約。
3. 於單元測試驗證全額結清沖償流程與流水拆分。
