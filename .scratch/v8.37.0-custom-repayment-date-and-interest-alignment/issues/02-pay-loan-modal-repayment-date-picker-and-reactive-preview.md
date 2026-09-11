# Ticket 02: 還款彈窗自訂還款日期控制項與響應式動態試算

## 🎯 任務目標
在 `src/components/CashLedgerWorkspace.tsx` 的還款彈窗（Pay Loan Modal）中，新增「📅 還款/扣款日期 (`payDateInput`)」日期選擇器，並讓彈窗內的利息試算與清償明細隨日期動態即時響應。

---

## 🛠️ 具體變更要點
1. **彈窗狀態管理**：
   - 新增 `payDateInput` 狀態（字串 YYYY-MM-DD），`handleOpenPayLoan` 時預設為當前今日。
2. **UI 控制項佈局**：
   - 位於「扣款券商/銀行帳戶」與「還款金額」之間。
   - 標籤為 `📅 還款扣款生效日:`。
   - 防呆限制：`min={payLoanTarget.loan.startDate || payLoanTarget.loan.date}`，`max={new Date().toISOString().split('T')[0]}`。
3. **響應式動態試算 (Reactive Preview)**：
   - `payoffMetrics` 改以 `calculateLoanInterestAndPayoff(payLoanTarget.loan, payDateInput)` 計算。
   - 即時試算區塊（`applyDebtRepayment`）傳入 `repaymentDate: payDateInput`。
   - 切換至昨天時，計息天數、應計利息與實質沖償本金立即動態刷新。

---

## ✅ 驗收標準
- [ ] 還款 Modal 中可自由選擇日期（如昨天）。
- [ ] 選擇昨天時，試算面板顯示計息 1 天，利息與本金沖償金額即時變動。
