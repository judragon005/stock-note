# Ticket 02: 質押借貸卡片按鈕單一化（還款/繳息整併）與彈窗快捷帶入

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0119-pledge-unified-repayment-and-smart-money-resilience-spec.md` (模組一)
- 關聯 Issue: #32

## 任務目標
在 `src/components/CashLedgerWorkspace.tsx` 中，將股票質押借貸卡片底部的「💰 繳息」與「💳 還本」兩個按鈕合併為單一主要按鈕「💳 還款 / 繳息」，保留「⚡ 一鍵結清」。彈窗內提供「帶入本期利息」與「帶入本息總額」快捷帶入，依《民法》第 323 條法定沖償順序即時預覽拆分。

## 具體修改清單
1. **`src/components/CashLedgerWorkspace.tsx`**：
   - 卡片底部按鈕調整：
     - 移除二元分立的「💰 繳息」與「💳 還本」。
     - 整合為主要按鈕：`[💳 還款 / 繳息]`（觸發 `handleOpenPayLoan(loan, 'UNIFIED_REPAY')`）。
     - 保留次要按鈕：`[⚡ 一鍵結清]`（觸發 `handleOpenPayLoan(loan, 'FULL_PAYOFF')`）。
   - 還款彈窗 (Pay Loan Modal) 體驗優化：
     - 標題統整為「貸款還款 / 繳息沖償」。
     - 在還款金額輸入框上方或旁邊提供快捷點擊鍵：
       - `[帶入本期利息 NT$ xxx]`：點擊後輸入框自動填入當前計息利息數值。
       - `[帶入本息總額 NT$ yyy]`：點擊後自動填入當前本利總和數值。
     - 依民法 323 條即時展示沖償試算（折抵規費 $0、繳納利息 $A、沖抵本金 $B、還款後剩餘本金 $C）。
     - 保持自訂還款日期 (`payDateInput`) 之響應連動。
2. **測試驅動開發 (`src/components/CashLedgerWorkspace.test.tsx`)**：
   - 驗證卡片底部渲染「💳 還款 / 繳息」與「⚡ 一鍵結清」按鈕。
   - 驗證點擊彈窗之快捷鍵正確帶入利息與本利和數值。
   - 驗證提交後依民法順序完成扣繳。

## 驗收標準
- [ ] 卡片底部按鈕簡化為 2 顆（還款/繳息 + 一鍵結清），佈局不擁擠。
- [ ] 彈窗快捷鍵帶入數值精確，即時計算無延遲。
- [ ] 相關單元測試 100% 通過。
