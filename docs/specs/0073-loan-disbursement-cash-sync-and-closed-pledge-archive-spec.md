# 產品需求文件 (PRD) - 股票質押借款撥款金流同步與已結清歷史歸檔規格

- **文件編號**：PRD-0073
- **功能名稱**：股票質押借款撥款金流同步、零本金斷頭誤判防禦與已結清借貸歷史歸檔
- **版本**：v7.5.0
- **狀態**：ready-for-agent

---

## Problem Statement

使用者在投資記帳與資產槓桿管理過程中，遇到兩個嚴重的記帳與風控展示問題：
1. **借款入帳缺失導致現金帳平白虧損**：使用者於 2026 年 7 月 28 日建立了兩筆股票質押借貸，但當前現金帳僅有償還本金與利息的支出扣款紀錄（`LOAN_REPAYMENT`），完全沒有當初借款成立時的撥款入帳紀錄（`LOAN_DISBURSEMENT`）。這導致現金帳戶可用餘額被單向虛減，帳目無法平衡。
2. **已結清借貸持續占用監控看板並誤判斷頭**：使用者已將股票質押借款本金全額歸還（未還借款本金為 NT$ 0），但系統仍以核心卡片持續展示在頂部「即時槓桿風控看板」中。更嚴重的是，計算引擎在未還本金為 0 時直接給予維持率 0.0%，觸發了追繳斷頭紅燈警報（「0.0% (🔴 追繳斷頭)」），且持續顯示殘留的設質規費（NT$ 53 / NT$ 54）與繳息/還本按鈕，嚴重破壞使用者體驗與風控真實性。

---

## Solution

1. **借貸撥款入帳自動連動與歷史平帳機制**：
   - 在建立新借貸/質押項目時，表單新增「自動於關聯帳戶產生借款撥款入帳金流 (`LOAN_DISBURSEMENT`)」選項（預設打勾），金流日期對齊借款起日，金額為正數，確保借入資金與後續還款能借貸平衡。
   - 針對 2026-07-28 既有已還款但缺少借款入帳的歷史借貸，提供一鍵偵測與自動補登對齊機制，將缺漏的借款本金自動回補至關聯帳戶。
2. **進行中借貸與已結清歷史紀錄分流展示**：
   - 頂部「股票質押與槓桿風控看板」專注於即時風險監控，**僅展示進行中（未還本金 > 0）的借貸卡片**。若所有借貸皆已結清，展示「🟢 目前無未結清之借貸或質押負債，所有槓桿已解除」之安全看板。
   - 歸還完成（未還本金 === 0 且結清）之項目自動收納至下方獨立的「歷史借貸與質押已結清紀錄」折疊清單/表格中，清晰呈現借款起日、結清日、借款金額與當初質押之擔保品歷史。
3. **零本金維持率防禦與規費結清清除**：
   - 修正維持率計算引擎：當未還借款本金為 0 時，維持率不適用斷頭計算，狀態標記為 `SAFE`（維持率呈現 `100%` 或 `--` 無負債），徹底消除「0.0% 追繳斷頭」誤判。
   - 修正結清計算：已全額歸還或一鍵結清之借貸，應還款總金額、利息與規費歸零，不再殘留規費欠款提示。

---

## User Stories

1. As an investor who uses stock pledge financing, I want the system to automatically record a cash inflow transaction (`LOAN_DISBURSEMENT`) when I create a loan, so that my bank account balance accurately reflects the borrowed cash received on the loan start date.
2. As an investor with historical pledge loans created on 2026-07-28 that only show repayment outflows, I want a one-click reconciliation tool or auto-detection, so that the missing loan disbursement entries are retroactively added and my ledger balances are perfectly reconciled.
3. As an active trader monitoring portfolio risk, I want the top risk dashboard to display only active loans with outstanding balances (`principal > 0`), so that I am not distracted by settled loans from the past.
4. As an investor who has fully repaid a stock pledge loan, I want the repaid loan to automatically transition to a dedicated "Historical & Settled Loans" archive table/drawer, so that I maintain a complete historical audit trail of past collaterals and borrowings without cluttering active monitoring.
5. As an investor who has zero outstanding loan principal, I want the pledge maintenance ratio engine to recognize zero debt as completely safe (`SAFE` / 100% or `--`) rather than calculating `0.0% (Margin Call / Liquidation)`, so that I never see false warning alerts for fully cleared debt.
6. As an investor who executes full payoff or full principal repayment, I want all accrued interest and pledge fees to be cleared to zero upon settlement, so that the loan card does not erroneously display residual fees such as NT$ 53 or NT$ 54.
7. As an investor creating a loan, I want to choose whether the borrowed cash was deposited into a specific broker bank account or an external account, so that my internal trading cash balance matches reality.
8. As a user reviewing settled loans, I want to see the total borrowing amount, collateral released, interest paid, and final payoff date in the history view, so that I have full transparency over my historical leverage costs.
9. As a mobile or desktop user, I want the active pledge cards to gracefully hide when count is zero and display a clean "No Outstanding Debt" card, so that my workspace layout remains clean and reassuring.
10. As an auditor of the cash ledger, I want all generated disbursement transactions to be bidirectionally tagged with `relatedLoanId`, so that editing or deleting a loan can safely warn and reconcile associated cash records.

---

## Implementation Decisions

### 1. 模組變更與職責劃分
- **`src/engine/cashLedgerEngine.ts` (計算引擎核心)**：
  - 更新 `calculatePledgeMaintenanceRatio`：當 `loan.principal <= 0` 時，維持率應為 `Infinity`（格式化為 `100%` 或 `--`），狀態設定為 `'SAFE'`，`isMarginCall: false`。
  - 更新 `calculateLoanInterestAndPayoff`：當 `loan.principal <= 0`（且已無未繳利息）時，`totalPayoffAmount`、`accruedInterest` 與未清償規費均應為 0。
  - 新增 `createLoanDisbursementTransaction` 輔助函式：根據借貸起日、關聯帳戶、幣別與本金金額，生成標準化 `LOAN_DISBURSEMENT` 現金帳流水。
- **`src/components/LoanModal.tsx` (借貸新增/編輯彈窗)**：
  - 新增勾選框：「自動於關聯帳戶記錄借款撥款入帳 (LOAN_DISBURSEMENT)」（新增借貸時預設為 true）。
  - 當建立借貸時，將該選項傳遞給儲存處理函式。
- **`src/components/CashLedgerWorkspace.tsx` (現金與借貸工作區)**：
  - 在 `handleSaveLoan` 中，若啟用撥款入帳，自動產生對應的 `LOAN_DISBURSEMENT` 現金流水並存入帳本。
  - 分流借貸資料：
    - `activeLoans`: `scopedLoans.filter(l => (l.principal || 0) > 0)`
    - `closedLoans`: `scopedLoans.filter(l => (l.principal || 0) <= 0)`
  - 風控卡片看板僅渲染 `activeLoans`；若 `activeLoans.length === 0`，展示無負債綠色安全提示。
  - 在風控卡片看板下方新增可折疊的「歷史借貸與質押已結清紀錄」區塊，展示 `closedLoans` 之借貸項目、起訖日、擔保品、利率與結清狀態。
  - 新增「歷史借貸入帳平帳檢查 (Reconcile Historical Disbursement)」按鈕或自動偵測，比對既有借貸與現金帳流水，若發現有 `LOAN_REPAYMENT` 但缺少對應的 `LOAN_DISBURSEMENT`，提示使用者並一鍵補齊 2026-07-28 的入帳金流。

---

## Testing Decisions

- **測試原則**：遵循測試驅動開發 (TDD)，針對公開介面縫隙 (Test Seams) 撰寫單元測試，驗證業務邏輯與邊界條件，不依賴 UI 實作細節。
- **測試縫隙 (Test Seams)**：
  - `calculatePledgeMaintenanceRatio`：
    - 驗證 `principal = 0` 時，維持率不為 0，狀態為 `SAFE` 且 `isMarginCall` 為 `false`。
  - `calculateLoanInterestAndPayoff`：
    - 驗證 `principal = 0` 且無未繳利息時，`totalPayoffAmount` 為 0。
  - `createLoanDisbursementTransaction`：
    - 驗證能依據 `LoanRecord` 正確產生金額為正數、類別為 `LOAN_DISBURSEMENT`、帶有 `relatedLoanId` 的有效現金流水。
  - 現有回歸測試：確保 `npm test` 既有 24 個測試套件全數維持 100% 綠燈通過。

---

## Out of Scope

- 新增第三方銀行 API 即時同步借貸利率與自動扣款。
- 修改股票交易（買賣/股息/減資）既有的交割對齊演算法。
- 美股融券放空專屬的保證金借券系統。

---

## Further Notes

- 本次改動嚴格遵循 KISS 原則與金字塔原理，避免過度工程化。
- 本地票券將同步建立至 `.scratch/v7.5.0-loan-disbursement-cash-sync-and-closed-pledge-archive/issues/`。
