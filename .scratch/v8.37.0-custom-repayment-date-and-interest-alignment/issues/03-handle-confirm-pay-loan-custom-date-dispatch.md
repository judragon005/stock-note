# Ticket 03: 還款送出全面套用自訂生效日期入帳

## 🎯 任務目標
在 `src/components/CashLedgerWorkspace.tsx` 的 `handleConfirmPayLoan` 函式中，徹底移除硬編碼的 `todayStr`，將所有交易分錄與合約付息起點對齊使用者指定的 `payDateInput`。

---

## 🛠️ 具體變更要點
1. **統一提取有效日期**：
   - `const effectiveDate = payDateInput || todayStr;`
2. **三種模式全面適配**：
   - **`REPAY_PRINCIPAL` 部分還本**：
     - `applyDebtRepayment` 傳入 `repaymentDate: effectiveDate`。
     - 產生的 `splitTransactions` 日期均為 `effectiveDate`。
   - **`PAY_INTEREST` 繳息**：
     - `interestTx.date = effectiveDate`。
     - `updatedLoans` 推進 `lastInterestPaymentDate = effectiveDate`。
   - **`FULL_PAYOFF` 全額結清**：
     - `splitTxs` 日期均為 `effectiveDate`。
     - `closedDate` 與 `lastInterestPaymentDate` 均設為 `effectiveDate`。
3. **成功通知文案升級**：
   - 提示視窗加入日期資訊（如「✅ 成功於 2026-09-10 還款 NT$ 1,012,120...」）。

---

## ✅ 驗收標準
- [ ] 補登昨日還款後，現金帳本中產生的紀錄日期為昨日。
- [ ] 借貸卡片上的「起日 / 前次繳息日」標章顯示為昨日。
