# Ticket 01: 底層計算引擎自訂還款日期與歷史補登計息防護

## 🎯 任務目標
在 `src/engine/cashLedgerEngine.ts` 與 `src/engine/cashLedgerEngine.test.ts` 中，建立並驗證自訂歷史還款日期 (`repaymentDate`) 的利息試算與清償分錄產生邏輯，確保時間序列在歷史補登場景下的 100% 精確度。

---

## 🛠️ 具體變更要點
1. **驗證 `calculateLoanInterestAndPayoff(loan, asOfDate)`**：
   - 當 `asOfDate` 為歷史日期（如 `2026-09-10`），且借款起日為 `2026-09-09` 時，計算天數必須精確為 1 天，利息精確為 NT$ 224。
   - 當 `asOfDate < loan.startDate` 時，防呆回傳 `daysElapsed = 0, accruedInterest = 0`。
2. **驗證 `applyDebtRepayment({ ..., repaymentDate })`**：
   - 生成的 `splitTransactions` 交易分錄（規費、利息、還本）之 `date` 必須 100% 與 `repaymentDate` 嚴格相等。
   - 利息全額清償時，`updatedLoan.lastInterestPaymentDate` 必須推進為 `repaymentDate`。
3. **編寫 TDD 單元測試**：
   - 覆蓋昨日還款、跨週末還款、同一天還款（0 天計息）之邊界情況。

---

## ✅ 驗收標準
- [ ] `npm test src/engine/cashLedgerEngine.test.ts` 綠燈通過。
- [ ] 歷史還款日產生之分錄日期精確無誤。
