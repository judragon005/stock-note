# Ticket 02: 電匯 T+2 與質押撥款 T+1 在途自動推算升級 (Settlement Calendar Automation)

## 需求說明
- 升級 `getSettlementDate`：
  - 跨國換匯/電匯 (`FX_TRANSFER_IN`, `FX_TRANSFER_OUT`, `WIRE_FEE`) 預設 `T+2`。
  - 質押借款撥款 (`LOAN_DISBURSEMENT`) 預設 `T+1`。
- 在 `CashTransactionModal.tsx` 與 `cashLedgerEngine.test.ts` 新增測試並驗證連動。

**Status:** completed

- [x] 升級 `getSettlementDate` 支援電匯 T+2 與質押 T+1 自動推算。
- [x] 撰寫完整單元測試驗證避開週末之正確推算。
- [x] 彈窗表單即時響應類別切換。
