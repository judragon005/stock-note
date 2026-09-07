# ADR-0075: 歷史已結清借貸規費明細計算校正與結清還款日手動維護架構

- **狀態**：ACCEPTED
- **日期**：2026-09-03
- **相關 PRD**：[PRD-0075](file:///d:/APP/股票紀錄/docs/specs/0075-settled-loan-fee-breakdown-bugfix-and-payoff-date-editor-spec.md)

---

## 背景與問題脈絡 (Context)

使用者在股票質押已結清紀錄中發現兩大問題：
1. **設質登記費為 0 卻被誤算為 53/54 且總成本重複計費**：
   使用者在永豐金質押借貸中僅登記了撥券費（NT$ 53 / NT$ 54），設質登記費為 0。然而計算引擎誤將舊版單一欄位 `pledgeFee: 53` 作為設質費回退，且在無法正則拆解現金帳本規費流水備註時直接將整筆金額塞給設質登記費，導致已付設質費變成 53/54，與撥券費重複計費。
2. **結清還款日缺乏手動校正入口**：
   當缺乏還款流水時，系統預設以今日（2026-09-03）作為結清日，導致借款天數失真。且 `LoanModal` 未提供欄位供使用者手動輸入或校準真實還款日。

---

## 決策內容 (Decisions)

1. **規費聚合單一事實來源 (SSOT) 判定修正**：
   - 在 `calculateLoanSettledSummary` 中：
     - 若借貸本體存在明確的三大規費設定（`transferFee`、`pledgeRegistryFee` 或 `handlingFee`），**嚴格以明細設定為事實標準**。
     - 若 `pledgeRegistryFee: 0`，設質費絕對強制為 0，絕不被舊相容性欄位 `pledgeFee` 或未拆分流水污染。
     - 總規費精確等於 `paidTransferFee + paidPledgeRegistryFee + paidHandlingFee`，徹底杜絕重複加總。
2. **`LoanModal` 支援結清還款日手動編輯**：
   - 當編輯未還本金為 0 之借貸項目時，在表單中動態呈現「**✅ 結清還款日 / 終止日 (已結清借貸)**」日期選擇器，支援隨時調整真實結清日期並儲存至 `LoanRecord.closedDate`。

---

## 影響評估與驗證 (Consequences & Verification)

- **優點**：
  - 徹底解決設質費 0 值被污染與規費翻倍計算的嚴重會計 Bug。
  - 賦予投資人對真實還款日期的完全控制權。
- **驗證**：
  - 新增單元測試鎖定真實場景：`transferFee: 53, pledgeRegistryFee: 0, pledgeFee: 53` 確保 `paidPledgeRegistryFee` 嚴格為 0。
  - 45 個測試套件、489 個測試案例全數 100% 綠燈通過。
  - TypeScript 嚴格模式 0 錯誤。
