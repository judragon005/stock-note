---
title: "Ticket 02: LoanModal 表單支援借款撥款入帳勾選與連動寫入現金帳本"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `LoanModal.tsx` 中新增「自動於關聯帳戶記錄借款撥款入帳 (LOAN_DISBURSEMENT)」選項，並在儲存時連動產生現金金流。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 新增 `autoRecordDisbursement` 狀態（新增借貸時預設打勾），提供友善提示文字。
- [x] 2. 在 `onSaveLoan` 回調中傳遞撥款入帳標記與金額。
- [x] 3. 確保編輯既有借貸時不會重複重複觸發入帳金流。
