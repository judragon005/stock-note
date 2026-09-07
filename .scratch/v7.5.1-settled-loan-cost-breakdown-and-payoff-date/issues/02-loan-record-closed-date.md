---
title: "Ticket 02: LoanRecord 擴充 closedDate 並於還款結清時自動記錄"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `src/types/stock.ts` 中為 `LoanRecord` 擴充 `closedDate?: string`，並在使用者執行一鍵結清或本金償還至 0 時自動記錄結清日。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. `LoanRecord` 新增 `closedDate?: string` 欄位。
- [x] 2. 在 `CashLedgerWorkspace` 的 `handleConfirmPayLoan` 中，若本金歸零或執行結清，自動寫入當日日期為 `closedDate`。
