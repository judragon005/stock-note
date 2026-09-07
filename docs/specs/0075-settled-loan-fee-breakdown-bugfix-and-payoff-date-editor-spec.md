# 產品需求文件 (PRD) - 歷史已結清借貸規費明細計算校正與結清還款日手動維護規格

- **文件編號**：PRD-0075
- **功能名稱**：已結清借貸三大規費精準拆分修復與結清還款日可編輯化
- **版本**：v7.5.2
- **狀態**：ready-for-agent

---

## Problem Statement

使用者在實際使用股票質押已結清紀錄時發現兩大問題：
1. **已付設質登記費誤算與重複計費 Bug**：
   - 使用者在永豐金質押借貸中僅登記了撥券費（NT$ 53 / NT$ 54），設質登記費與開辦手續費均登記為 0（合計規費 `pledgeFee` 為 53 / 54）。
   - 然而在已結清歷史卡片中，系統卻顯示「已付設質費: NT$ 53、已付撥券費: NT$ 53」，將整筆合計規費誤認作設質費，導致設質費無法歸零且總成本重複計算。
2. **結清還款日缺乏手動校準途徑**：
   - 當歷史借貸缺少精確還款流水或 `closedDate` 時，系統自動 fallback 至當前系統日期（如 2026-09-03），導致借款歷時天數計算失真。
   - 目前 `LoanModal` 編輯彈窗未開放編輯「結清還款日」，使用者無法手動將其校準為真實還款日期。

---

## Solution

1. **規費聚合引擎精準拆分 (SSOT 規則)**：
   - 修復 `calculateLoanSettledSummary`：嚴格以 `loan.transferFee`、`loan.pledgeRegistryFee`、`loan.handlingFee` 為單一事實來源。
   - 若欄位已明確設定（包括明確設為 0），則**絕不使用舊相容欄位 `pledgeFee` 進行覆蓋或 fallback**。
   - 若現金帳本只有一筆總額規費流水且備註無法正則拆分時，優先依照 `loan` 身上明確登記之各項目數值進行映射拆分，絕不粗暴全數塞入設質費。
2. **`LoanModal` 支援結清還款日編輯**：
   - 在編輯借貸彈窗中，當未還本金為 0（已結清借貸）時，動態顯示「**結清還款日** (closedDate)」日期選擇器（預設顯示既有結清日或今日），允許使用者隨時檢視並手動調整真實結清日期。

---

## User Stories

1. As a loan user who registered NT$ 53 for transfer fee and NT$ 0 for pledge registry fee, I want the settled loan card to display "已付設質費: NT$ 0" and "已付撥券費: NT$ 53", so that the fee breakdown strictly reflects what I actually paid.
2. As an investor reviewing total borrowing cost, I want the total cost to be the exact sum of actual interest plus actual fees without duplicate fee additions.
3. As a user whose settled loan was repaid on a specific past date, I want to edit the "結清還款日" in the loan modal, so that the days elapsed and lifecycle dates match my broker's historical statements.
4. As a test engineer, I want automated unit tests verifying that `pledgeRegistryFee: 0` is strictly respected and never polluted by `pledgeFee`.

---

## Implementation Decisions

### 1. 核心計算引擎修正 (`src/engine/cashLedgerEngine.ts`)
- 修改 `calculateLoanSettledSummary` 規費判定：
  ```typescript
  // 若 loan 自身具備任一三大規費欄位，以該數值為準，明確為 0 即為 0
  const hasSpecificFees = loan.transferFee !== undefined || loan.pledgeRegistryFee !== undefined || loan.handlingFee !== undefined;
  
  if (hasSpecificFees) {
    paidTransferFee = loan.transferFee ?? 0;
    paidPledgeRegistryFee = loan.pledgeRegistryFee ?? 0;
    paidHandlingFee = loan.handlingFee ?? 0;
  } else {
    // 僅在極早期完全無明細欄位之舊資料，才以舊 pledgeFee 作為設質費
    paidPledgeRegistryFee = loan.pledgeFee ?? 0;
  }
  ```
- 徹底消除 `paidPledgeRegistryFee = loan.pledgeRegistryFee ?? (loan.pledgeFee ?? 0)` 導致的 0 變 53 問題。

### 2. 編輯彈窗介面升級 (`src/components/LoanModal.tsx`)
- 新增 `closedDate` 狀態：`const [closedDate, setClosedDate] = useState<string>('');`。
- 當編輯既有借貸且未還本金為 0（`parseFloat(principal) === 0`）時，在表單中渲染「結清還款日」欄位。
- 儲存時將 `closedDate` 回寫至 `loan` 物件。

---

## Testing Decisions

- 於 `cashLedgerEngine.test.ts` 加入專屬回歸測試：
  - 驗證當 `transferFee: 53, pledgeRegistryFee: 0, pledgeFee: 53` 時，`paidPledgeRegistryFee` 必定為 0，`paidTransferFee` 必定為 53，總借貸成本不重複計算。

---

## Out of Scope

- 針對銀行外幣匯費進行即時牌告匯率折算。
