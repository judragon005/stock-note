# Spec 0118: 質押借貸自訂還款日期、歷史補登利息動態對齊與編輯付息日規格書

## Problem Statement

在 V8.36.0 (Spec 0117) 成功實作「費用 ➔ 利息 ➔ 本金」法定沖償順序引擎後，真實用戶場景中浮現出關鍵的時間軸對帳痛點：

### 1. 還款操作強制鎖定為系統「今日」，歷史補登利息多算 (Repayment Date Hardcoded to Today)
- **實務操作與記帳時差**：投資人於券商 APP 實際執行還款的時間往往是**昨日或前數日**（例如 2026-09-10 還款），但在隔日（2026-09-11）或週末才打開記帳系統進行補登。
- **計息天數多算導致本金沖償金額被侵蝕**：現行 [`CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) 還款彈窗（Pay Loan Modal）完全**缺乏「還款日期」的輸入欄位**，試算與提交邏輯強制使用 `new Date().toISOString().split('T')[0]`。
- **財務失真連鎖反應**：
  - 借款日 9/9、券商實際 9/10 還款（計息 1 天，利息 NT$ 224）。
  - 但因 9/11 補登，系統自動計算為 2 天（9/9 ~ 9/11），利息試算為 NT$ 448。
  - 使用者依券商扣款 NT$ 1,012,120 輸入時，系統扣抵了 NT$ 448 的利息，導致沖償本金縮水為 NT$ 1,011,612（少沖了 NT$ 224），剩餘本金與券商 APP 產生落差。

### 2. 繳息日起算點與現金帳本流水日期偏離 (Date Provenance & Ledger Skew)
- 還款成功後，系統將借貸合約的 `lastInterestPaymentDate` 推進到**「補登今日 (9/11)」**，而非真實的還款日（9/10）。這導致從 9/10 到 9/11 這一天的剩餘本金利息未來再度漏算或錯置。
- 自動生成的現金帳本流水紀錄（`WIRE_FEE`, `FINANCING_FEE`, `LOAN_REPAYMENT`）其 `date` 被硬標記為補登今日，無法與銀行交割存摺、券商對帳單之真實扣款日吻合。

### 3. 缺乏借貸合約「前次繳息/還款日」手動修正通道 (Lack of Last Interest Date Editor)
- 當使用者之前曾因誤操作推進了付息日，或初始建立借貸合約時需要設定已在其他地方繳過息的歷史合約時，在 [`LoanModal.tsx`](file:///d:/APP/股票紀錄/src/components/LoanModal.tsx) 中僅能設定「借款日期 (`startDate`)」，無法手動指定或修復「前次繳息日 (`lastInterestPaymentDate`)」。

---

## Solution

### 1. 還款彈窗新增「還款日期 (Repayment Date)」控制項與即時連動試算
1. **彈窗新增日期輸入框**：
   - 在 `CashLedgerWorkspace.tsx` 的還款彈窗中，新增「📅 還款/扣款日期 (`payDateInput`)」欄位。
   - 預設值帶入當日 (`todayStr`)，支援自由點選為昨日或歷史任一有效日期。
   - 防呆限制：`min` 屬性設定為 `loan.startDate || loan.date`，防止使用者輸入早於借款起日的無效日期。
2. **響應式動態利息試算 (Reactive Preview)**：
   - 當使用者變更 `payDateInput` 時，即時以該日期為參數呼叫 `calculateLoanInterestAndPayoff(loan, payDateInput)`。
   - 彈窗內的「應計利息 (計息 N 天)」、「沖償本金明細」、「預估還款後剩餘本金」即時連動刷新。
   - 選擇 9/10 即顯示「計息 1 天，利息 NT$ 224，沖本 NT$ 1,011,836，剩餘本金 NT$ 1,000,164」，所見即所得。

### 2. 三大動作模式全面以自訂還款日期入帳
在 `handleConfirmPayLoan` 中，以使用者選定的 `payDateInput` 作為真實生效日期：
1. **部分還本 (`REPAY_PRINCIPAL`)**：
   - 傳入 `applyDebtRepayment({ loan, repaymentAmount, repaymentDate: payDateInput, ... })`。
   - 更新合約之 `lastInterestPaymentDate` 推進至 `payDateInput`。
   - 自動產生之現金帳本流水分錄（`WIRE_FEE`, `FINANCING_FEE`, `LOAN_REPAYMENT`）之 `date` 均記為 `payDateInput`。
2. **繳交利息 (`PAY_INTEREST`)**：
   - 利息流水 `date` 記為 `payDateInput`，合約 `lastInterestPaymentDate` 更新為 `payDateInput`。
3. **全額結清 (`FULL_PAYOFF`)**：
   - 依 `calculateLoanInterestAndPayoff(loan, payDateInput)` 計算結清利息，生成之流水與 `closedDate`、`lastInterestPaymentDate` 均設為 `payDateInput`。

### 3. 借貸建立/編輯彈窗 (`LoanModal.tsx`) 新增「前次繳息/還款基準日」手動維護欄位
- 在進階/日期設定區域新增選填欄位「前次繳息/還款基準日 (`lastInterestPaymentDate`)」。
- 預設留空（自動繼承起借日），若填寫則允許手動微調校正歷史付息起算點，方便處理既有借貸合約。

---

## Technical Specifications & Architecture

### 1. `CashLedgerWorkspace.tsx` 狀態擴充
```typescript
// 還款彈窗擴充日期狀態
const [payDateInput, setPayDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);

// 開啟彈窗時重設為今日
const handleOpenPayLoan = (loan: LoanRecord, actionType: ...) => {
  setPayDateInput(new Date().toISOString().split('T')[0]);
  ...
};

// 彈窗內部動態試算
const payoffMetrics = useMemo(() => {
  if (!payLoanTarget) return null;
  return calculateLoanInterestAndPayoff(payLoanTarget.loan, payDateInput);
}, [payLoanTarget, payDateInput]);
```

### 2. `handleConfirmPayLoan` 整合
```typescript
const effectiveDate = payDateInput || todayStr;

// applyDebtRepayment 呼叫
const repaymentResult = applyDebtRepayment({
  loan,
  repaymentAmount: numAmount,
  repaymentDate: effectiveDate,
  targetAccountId,
});
```

---

## Verification Plan

### Automated Tests
1. **單元測試 (`cashLedgerEngine.test.ts`)**：
   - 測試 `calculateLoanInterestAndPayoff(loan, '2026-09-10')` 在借款日為 `2026-09-09` 時，計息天數精確為 1 天，利息為 224。
   - 測試 `applyDebtRepayment` 在指定歷史日期 `2026-09-10` 時，產生之 `splitTransactions` 的 `date` 均為 `2026-09-10`，合約推進繳息日亦為 `2026-09-10`。
2. **元件整合測試 (`CashLedgerWorkspace.test.tsx` 或等價測試)**：
   - 驗證還款 Modal 渲染「還款日期」輸入框，切換日期至昨日時，即時試算面板數值正確更新。
   - 送出還款後，產生的帳本交易紀錄日期符合輸入之自訂日期。
3. **`npm test` 全量迴歸測試**：
   - 保證既有 744 個測試 100% 綠燈通過。
4. **`npm run build` 構建驗證**：
   - 確保 TypeScript 0 錯誤、打包成功。
