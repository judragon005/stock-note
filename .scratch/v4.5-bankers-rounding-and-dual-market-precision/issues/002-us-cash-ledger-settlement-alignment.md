# Issue #2: 美股交割款、預扣稅與現金帳本餘額精度清洗閉環

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`feature`, `cash-ledger`, `schwab`
- **關聯規格**：`docs/specs/0028-bankers-rounding-and-dual-market-precision-system.md` (AC-2)

## 任務描述 (Description)
在 `src/engine/cashLedgerEngine.ts` 中，將美股股息 30% 預扣稅、買賣交割款與帳戶餘額匯總計算全面對齊 Banker's Rounding，使嘉信理財等美股券商餘額 100% 精準對齊（如 `$224.79`）。

## 驗收標準 (Acceptance Criteria)
1. `syncTradesWithCashTransactions` 中美股交易交割款與股息預扣稅使用 `bankersRound(..., 2)`。
2. `calculateAccountBalances` 針對 USD 帳戶餘額與各統計欄位進行 `bankersRound` 精度清洗。
3. 單元測試驗證交割款與多筆股息稅累加結果與嘉信對帳單精確一致。
