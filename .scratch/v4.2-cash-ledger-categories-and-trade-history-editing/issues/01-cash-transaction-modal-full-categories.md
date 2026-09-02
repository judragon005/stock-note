# 任務 01: 現金收支彈窗全量交易類別擴充與收支流向防呆

- **狀態**: Completed (已完成)
- **分流標籤**: `ready-for-agent`
- **類型**: UI / Core / Ledger
- **優先級**: P0 (Phase 1)
- **對應 PRD**: SPEC-0025 (AC-1, AC-2)

## 任務描述
在 `CashTransactionModal.tsx` 中補齊 13 種交易類別（現金股息、買進扣款、賣出入帳、減資退款、稅費扣除、借貸撥款、借貸還本等），並於提交時自動依收支性質校正金額正負號。在 `cashLedgerEngine.ts` 中擴展 `calculateAccountBalances` 完整處理所有新類別。

## 驗收標準 (Acceptance Criteria)
- [x] 在 `CashTransactionModal.tsx` 擴展 `categories` 陣列包含 13 個收支類別與專屬圖示色彩。
- [x] 完善 `handleSubmit` 之流出金額負數判定（`WITHDRAWAL`、`FINANCING_FEE`、`WIRE_FEE`、`STOCK_BUY`、`LOAN_REPAYMENT`、`TAX`、`FEE`）。
- [x] 擴充 `calculateAccountBalances` 支援 `LOAN_DISBURSEMENT`、`LOAN_REPAYMENT`、`CAPITAL_RETURN`、`TAX` 累計。
- [x] 確保 TypeScript 型別安全，無型別衝突。
