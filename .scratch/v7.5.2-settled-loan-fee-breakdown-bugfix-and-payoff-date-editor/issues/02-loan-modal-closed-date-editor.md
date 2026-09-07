---
title: "Ticket 02: LoanModal 表單新增「結清還款日」欄位支援手動校正"
labels: ["completed", "enhancement"]
---

## 🎯 任務目標
在 `LoanModal.tsx` 中，當借貸為已結清（本金為 0）時，在表單中呈現「結清還款日 (closedDate)」日期選擇器，允許使用者手動編輯調整真實還款日。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 表單支援 `closedDate` 輸入並儲存至 `LoanRecord`。
- [x] 2. 只有已結清或未還本金為 0 時呈現該欄位，避免干擾進行中借貸。
