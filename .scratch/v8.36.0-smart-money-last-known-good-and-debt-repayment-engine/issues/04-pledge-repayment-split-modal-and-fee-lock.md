# 04 — 還款彈窗智慧拆分試算與規費結清防重複計費 (Pledge Repayment Split Modal & Fee Lock)

**What to build:**
升級 `CashLedgerWorkspace.tsx` 中的借貸還款彈窗：
1. **即時智慧拆分試算**：當使用者輸入欲還款總金額時（如 `1,012,120`），介面動態即時計算並清晰展示拆分項目：
   - 設質規費抵扣：`NT$ 60`
   - 應計利息清算：`NT$ 224`
   - 本金沖償額度：`NT$ 1,011,836`
   - 預估剩餘借款本金：`NT$ 999,940`
2. **自動分筆記帳**：確認還款後，呼叫 `applyDebtRepayment` 並於現金帳本中精準寫入拆分之現金流水（`HANDLING_FEE`, `FINANCING_FEE`, `LOAN_REPAYMENT`），確保流水與銀行帳戶對帳單 100% 一致。
3. **規費扣抵歸零與防二次重複計費**：若規費在本次還款中已完全沖銷，更新後的借貸合約中對應之 `transferFee`、`pledgeRegistryFee` 或 `pledgeFee` 自動歸零，確保未來計算結清金額時絕不再度加上該 60 元。

**Blocked by:** Ticket 03

**Status:** complete

- [x] 升級還款彈窗（PayLoanModal）介面，加入「法定沖償即時拆分預覽區塊」
- [x] 整合 `applyDebtRepayment` 核心計算，輸入金額即時響應試算
- [x] 實作還款確認邏輯，自動寫入 1~3 筆拆分現金流水並更新借貸合約狀態
- [x] 鎖定已清償規費，防止卡片「當前應還款總金額」二次加總已繳之撥券規費
- [x] 手動與組件整合測試驗證輸入 `1,012,120` 扣繳成功、規費歸零與卡片金額更新
