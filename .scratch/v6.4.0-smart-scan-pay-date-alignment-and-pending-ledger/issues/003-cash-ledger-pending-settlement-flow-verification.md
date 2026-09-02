# 003 — cash-ledger-pending-settlement-flow-verification

**What to build:**
驗證智慧補登寫入的 `TradeRecord` 在未到達 `payDate` 時正確於現金流水帳呈現 `PENDING` 在途狀態（不計入可用現金餘額），到達 `payDate` 時自動轉為 `SETTLED`，並通過全量 TDD 與 TypeScript 編譯檢驗。

**Blocked by:** 002-modal-trade-record-pay-date-auto-apply

**Status:** ready-for-agent

- [x] 現金帳本引擎在讀取智慧補登之 `DIVIDEND` 紀錄時，以 `trade.payDate` 進行精準交割狀態劃分（未到期為 `PENDING` 在途，已到期為 `SETTLED`）
- [x] 撰寫整合測試驗證補登到現金帳本流轉之完整端到端生命週期
- [x] 本地全量執行 `npm test`（100% 通過）與 `npm run build`（TypeScript 0 錯誤）
