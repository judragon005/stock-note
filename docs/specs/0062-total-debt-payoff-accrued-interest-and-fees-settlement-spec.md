# Spec 0062: 全域借款負債納入應計利息與規費及一鍵結清本利和規格書

## Problem Statement

在現行借貸與股票質押會計系統中，存在計算口徑不完整與操作流程斷層之問題：
1. **全域 NAV 看板「借款負債」低估，未計入「應計利息與規費」**：
   - 頂部看板之借款負債（`leverageMetrics.totalDebtInTWD`）與曝險引擎（`riskExposureEngine.ts`）僅以借款未還本金（`loan.principal`）進行累加。
   - 質押借款實質上隨著計息天數推進已產生未繳之應計利息（`accruedInterest`）及設質三大規費（`pledgeFees`），未將其計入負債會導致帳戶實質全域淨資產（NAV）高估、槓桿負債比（LTV）失真。
2. **質押借款缺少「本利和 + 規費一鍵結清」之操作與自動化記帳**：
   - 借貸卡片僅提供「💰 繳交利息」與「💳 本金還款」兩種各自獨立之按鈕。
   - 當投資人欲解除質押或全額還清貸款時，必須手動計算本利和與規費並逐筆建立流水，缺乏一鍵結清並自動將「本金歸還 (`LOAN_REPAYMENT`)」、「利息支出 (`FINANCING_FEE`)」、「規費扣除 (`HANDLING_FEE`)」拆分至現金帳本的直覺機制。

## Solution

1. **全域借款負債公式升級 (Total Debt SSOT Alignment)**：
   - 在 [`calculateOverallLeverageMetrics()`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.ts) 與 [`calculatePortfolioExposure()`](file:///d:/APP/股票紀錄/src/engine/riskExposureEngine.ts) 中，每筆借款負債金額統一以其「本利和加規費」(`principal + accruedInterest + pledgeFees`) 計算折合台幣總額。
   - 全域淨資產 $\text{NAV} = \text{總持股市值} + \text{可用現金(含在途)} - \text{總借款負債(本利和+規費)}$，真實反映清償所有借貸後的真實淨值。
2. **借貸卡片新增「⚡ 一鍵結清 (本利和+規費)」功能**：
   - 在 [`CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx) 的各筆借貸卡片中新增「⚡ 一鍵結清」按鈕。
   - 點擊後開啟結清確認視窗，清晰展示「本金」、「應計利息 (計息 N 天)」、「設質三大規費」與「應付總額」。
3. **現金帳本精準拆分自動記帳 (Split Transactions Automation)**：
   - 確認結清後，系統自動於現金帳本產生 3 筆對應流水（若金額大於 0）：
     1. `LOAN_REPAYMENT` (借貸還本)：扣除未還本金 `principal`
     2. `FINANCING_FEE` (融資利息)：扣除應計利息 `accruedInterest`
     3. `HANDLING_FEE` (手續規費)：扣除設質三大規費總和 `pledgeFees`
   - 同步將該筆借款本金 `principal` 更新為 `0`，並將 `lastInterestPaymentDate` 更新為結清當日。

## User Stories

1. As a 股票質押/融資投資人, I want 頂部資產負債看板中的「借款負債」包含當前累計之應計利息與設質規費, so that 全域淨資產 (NAV) 能精確反映所有尚未清償的實質負債。
2. As a 股票質押/融資投資人, I want 在借貸管理卡片上能夠點擊「一鍵結清」, so that 我能直接看到截至今日包含本利和與規費的應還總額並一鍵完成清償。
3. As a 現金帳本管理者, I want 一鍵結清時系統能自動將本金、利息與規費拆分為獨立的現金帳本流水, so that 我的會計損益、稅務扣抵與利息支出報表能保持高精準度與稽核軌跡。

## Implementation Decisions

### 1. 負債計算公式 (Total Debt Formula)
- 單筆借款即時負債：
  $$\text{LoanDebt}_i = \text{principal}_i + \text{accruedInterest}_i + \text{pledgeFees}_i$$
  其中：
  - $\text{accruedInterest}_i = \lfloor \text{principal}_i \times \frac{\text{Rate}}{365} \times \text{daysElapsed} \rceil$
  - $\text{pledgeFees}_i = \text{transferFee} + \text{pledgeRegistryFee} + \text{handlingFee}$（或預設 $\text{pledgeFee}$）
- 整體總借款負債：
  $$\text{TotalDebt}_{\text{TWD}} = \sum_{i} \left( \text{LoanDebt}_i \times \text{FxRate}_i \right)$$

### 2. 帳本流水自動拆分規則 (Split Transaction Rules)
當執行一鍵結清時，依據結清明細產生如下流水：
- 若 `principal > 0` $\to$ 生成 `LOAN_REPAYMENT`，金額為 `-principal`，備註：`償還質押本金: {loan.name}`
- 若 `accruedInterest > 0` $\to$ 生成 `FINANCING_FEE`，金額為 `-accruedInterest`，備註：`結清質押利息 ({days}天): {loan.name}`
- 若 `pledgeFees > 0` $\to$ 生成 `HANDLING_FEE`，金額為 `-pledgeFees`，備註：`結清設質規費 (撥券/設質/手續): {loan.name}`

## Testing Decisions

- **測試縫隙 (Test Seams)**：
  1. [`src/engine/cashLedgerEngine.test.ts`](file:///d:/APP/股票紀錄/src/engine/cashLedgerEngine.test.ts)：
     - 測試 `calculateOverallLeverageMetrics` 確實累計本金 + 應計利息 + 規費。
     - 測試無負債時維持 0 負債與正確 NAV。
     - 測試美股/台股不同幣別匯率折算下的本利和負債。
  2. [`src/engine/riskExposureEngine.test.ts`](file:///d:/APP/股票紀錄/src/engine/riskExposureEngine.test.ts)：
     - 測試 `calculatePortfolioExposure` 在包含利息與規費後之 `totalDebtTWD`、`effectiveNavTWD` 與槓桿風險評級。
  3. [`src/components/CashLedgerWorkspace.tsx`](file:///d:/APP/股票紀錄/src/components/CashLedgerWorkspace.tsx)：
     - 驗證一鍵結清彈窗數值帶入與 3 筆拆分流水觸發。
