# 技術債 #0036: 質押借貸 FULL_PAYOFF 全額結清分支統一委託 applyDebtRepayment 引擎重構

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：[PR #24](https://github.com/judragon005/stock-note/pull/24) 雙軸程式碼審查 (Code Review Warning W1) / [Issue #25](https://github.com/judragon005/stock-note/issues/25)
- **建立日期**：2026-09-11
- **標籤**：`Refactor` · `Accounting` · `Debt` · `DRY`

---

## 1. 背景與現狀代碼 (Context & Current Code)

在 v8.36.0 (PR #24) 中，我們引入了金融實務等級的通用法定還款沖償引擎 `applyDebtRepayment`（位於 `src/engine/cashLedgerEngine.ts`），其遵循「規費 ➔ 利息 ➔ 本金」的嚴格法定順序，已完全接管了「部分還款 (`PARTIAL_PAY`)」之利息歸零與本金沖銷計算。

然而，在 `src/components/CashLedgerWorkspace.tsx` (L461-L533) 的 `executePayoff` 函式中，全額結清 (`FULL_PAYOFF`) 分支仍保留了原有的手動扣減與狀態組裝邏輯：

```ts
// src/components/CashLedgerWorkspace.tsx (L461-L533)
const loan = loans.find(l => l.id === targetLoanId);
if (!loan) return;

// 手工計算應收累計利息與全額扣款
const accruedInterest = calculateAccruedInterest(loan, effectiveDate);
const payoffAmount = loan.remainingPrincipal + accruedInterest;

// 手動組裝結清借貸項目，並手動寫入流水紀錄...
```

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

- **DRY 原則違反與雙軌邏輯維護成本**：
  - 目前系統內部存在兩套還款會計計算：一套為通用純函式 `applyDebtRepayment`，另一套為 UI 元件內部的手動全額結清組裝。
  - 若未來法規變更或質押條款新增違約金、展期手續費等費用項，需同時修改兩處。
  - 手動全額結清分支若未完全清零該筆借貸的未結清規費累積欄位（如 `accruedFee`），可能在邊界情況下留下微小會計遺留。
- **暫緩理由**：
  - 全額結清在已知本金與已計利息下屬於封閉式全數沖銷，現有既有測試與邏輯已 100% 綠燈覆蓋且行為正確。
  - 為遵守「PR 範疇聚焦原則」與「防禦性重構漸進原則」，避免在 v8.36.0 主 PR 中大幅變動穩定運行的結清 UI 狀態遷移，決定開立專屬技術債與 GitHub Issue #25 進行追蹤，留待下一迭代重構。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

將 `executePayoff` 內的 `FULL_PAYOFF` 分支全數重構為委託 `applyDebtRepayment` 引擎：

```ts
// 建議重構思路
const repaymentAmount = loan.remainingPrincipal + accruedInterest + (loan.accruedFee || 0);

const { updatedLoan, transactions, repaymentSummary } = applyDebtRepayment({
  loan,
  repaymentAmount,
  repaymentDate: effectiveDate,
  brokerAccountId: selectedBrokerAccountId,
  wireFee: 0,
});

// updatedLoan.remainingPrincipal 保證為 0，直接打上 status = 'SETTLED' 與 payoffDate
const settledLoan: LoanRecord = {
  ...updatedLoan,
  status: 'SETTLED',
  payoffDate: effectiveDate,
};
```

此重構將確保全額結清與部分還款皆使用 100% 相同之底層會計沖償引擎，杜絕邏輯分歧。
