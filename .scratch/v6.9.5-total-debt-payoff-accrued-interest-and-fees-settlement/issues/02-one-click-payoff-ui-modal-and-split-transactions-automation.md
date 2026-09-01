# 02 — 借貸卡片一鍵結清功能與現金帳本三筆拆分流水自動化

**What to build:** 
在 `CashLedgerWorkspace.tsx` 借貸管理卡片實作「⚡ 一鍵結清 (本利和+規費)」功能：
1. **一鍵結清操作入口與明細彈窗**：在質押與借貸卡片新增「⚡ 一鍵結清」按鈕，彈窗清晰展示結清明細（本金、應計利息及天數、設質規費細項、應付總額）與扣款帳戶選擇。
2. **自動拆分 3 筆現金帳本流水 (Split Transactions)**：
   - 扣除本金：產生 `LOAN_REPAYMENT` 流水
   - 扣除利息：產生 `FINANCING_FEE` 流水
   - 扣除規費：產生 `HANDLING_FEE` 流水
3. **借款狀態自動更新**：將該筆借款本金更新為 0，更新 `lastInterestPaymentDate` 為今日。

**Blocked by:** Ticket 01

**Status:** completed

- [x] 在 `CashLedgerWorkspace.tsx` 新增一鍵結清彈窗與狀態管理
- [x] 實作三筆流水精準拆分生成邏輯（過濾非 0 金額）
- [x] 結清完成後同步更新借貸記錄狀態與現金帳本
