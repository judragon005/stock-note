# Ticket #1: [Engine/TDD] 歷史帳本稅費智慧自動拆分修復純函式

- **狀態**: Completed
- **規格書**: [SPEC-0018](../../../docs/specs/0018-tax-fee-auto-repair-and-currency-engine.md)
- **架構決策**: [ADR-0018](../../../docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)

## 任務清單
- [x] 在 `src/engine/calculator.ts` 中實作 `repairLedgerTaxAndFee(trades: TradeRecord[]): { repairedTrades: TradeRecord[], fixedCount: number, totalTaxSeparated: number }`。
- [x] 自動檢測 `type === 'SELL'`、`market === 'TW'` 且 `tax === 0` 且 `fee > 0` 的異常台股紀錄。
- [x] 依成交額推導真實證交稅 `estimatedTax = calculateTaiwanTax(price, shares, isETF, isDayTrading, isBondETF)`。
- [x] 當 `fee >= estimatedTax` 時，將 `tax` 設為 `estimatedTax`，並將 `fee` 修正為 `max(1, fee - estimatedTax)`，確保總支出與已實現損益 100% 保持恆等。
- [x] 撰寫單元測試 `src/engine/calculator.test.ts` 驗證修復邏輯、損益不變性與不重複修復冪等性。
