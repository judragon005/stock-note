# ADR 0118: 質押借貸自訂還款日期、歷史補登利息動態對齊與編輯付息日

## 狀態
已通過 (Accepted) - 2026-09-11

## 脈絡與背景 (Context)
在 V8.36.0 (ADR 0117) 成功引入「費用 ➔ 利息 ➔ 本金」法定沖償順序後，使用者在實際對帳時發現關鍵時間軸落差：
1. **補登時差導致計息天數多算**：
   - 投資人通常於昨日（如 2026-09-10）在券商 APP 完成還款，隔日（如 2026-09-11）才開啟系統補登。
   - 舊版還款彈窗（Pay Loan Modal）完全沒有還款日期控制項，強制以補登當日（9/11）計算，導致利息天數由真實的 1 天（$224）被多算為 2 天（$448），進而侵蝕了沖償本金金額（少沖償了 $224），使得系統剩餘本金與券商 APP 產生落差。
2. **付息起點與流水帳日期錯置**：
   - 還款成功後，合約的 `lastInterestPaymentDate` 與現金帳本流水紀錄（`WIRE_FEE`, `FINANCING_FEE`, `LOAN_REPAYMENT`）強制被寫入補登今日（9/11），而非真實還款日（9/10），導致流水無法與銀行存摺扣款日記帳對齊。
3. **借貸編輯彈窗遺失付息日起點**：
   - 在 `LoanModal.tsx` 中缺乏手動維護「前次繳息日 (`lastInterestPaymentDate`)」的欄位，且編輯保存時遺漏了該屬性的繼承，導致使用者一旦點擊編輯保存，既有付息日起點即被覆蓋回借款起日，利息重新累積。

## 決策細節 (Decision Details)

### 1. 還款彈窗新增自訂「還款扣款生效日」控制項
- 在 `CashLedgerWorkspace.tsx` 還款彈窗中新增 `📅 還款扣款生效日 (payDateInput)` 輸入框，預設為今日（`todayStr`），允許自由點選為昨日或歷史有效日期。
- 加入防呆約束：`min={payLoanTarget.loan.startDate || payLoanTarget.loan.date}`，杜絕負數計息。

### 2. 響應式動態即時試算 (Reactive Preview)
- 彈窗內的 `payoffMetrics` 與 `applyDebtRepayment` 即時試算全面改以 `payDateInput` 作為評估參數。
- 當使用者切換至昨日（9/10）時，畫面即時響應呈現「計息 1 天，利息 NT$ 224，沖償本金 NT$ 1,011,836，剩餘借款本金 NT$ 1,000,164」，所見即所得，100% 吻合券商憑單。

### 3. 三大動作模式全面以自訂生效日入帳
- 在 `handleConfirmPayLoan` 中統一以 `effectiveDate = payDateInput || todayStr` 為準：
  - **部分還本 (`REPAY_PRINCIPAL`)**：傳入 `repaymentDate: effectiveDate`，合約付息起點推進至 `effectiveDate`，自動生成之拆分流水日期全數記為 `effectiveDate`。
  - **繳交利息 (`PAY_INTEREST`)**：利息流水與推進合約付息日均為 `effectiveDate`。
  - **全額結清 (`FULL_PAYOFF`)**：以 `effectiveDate` 評估利息，流水日期、`closedDate` 與 `lastInterestPaymentDate` 均設為 `effectiveDate`。

### 4. `LoanModal.tsx` 支援手動維護前次繳息基準日
- 於借款起日下方新增「前次繳息/還款基準日 (`lastInterestPaymentDate`)」選填輸入控制項，並在 `handleSubmit` 保存時正確持久化，提供使用者手動校正或建立歷史借貸之靈活性。

## 影響評估 (Consequences)
- **正面效益**：
  - 徹底消除了「昨天還款、今天補登」導致的利息多算與本金少沖問題，現金流水與銀行對帳單 100% 吻合。
  - 借貸合約編輯保存時不再遺漏 `lastInterestPaymentDate`，避免資料回溯踩坑。
- **邊界保護**：
  - 還款生效日設有下限防呆（不得早於借款起日），避免不合邏輯的時間序列。

## 關聯項目 (Related Items)
- 規格書：[0118-custom-repayment-date-and-interest-alignment-spec.md](../specs/0118-custom-repayment-date-and-interest-alignment-spec.md)
- GitHub Issue：[Issue #28](https://github.com/judragon005/stock-note/issues/28)
