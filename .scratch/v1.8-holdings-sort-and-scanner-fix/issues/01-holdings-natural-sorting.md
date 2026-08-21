# Ticket #1: [Engine/UI] 實作當前持倉庫存多維度自然排序（台股優先、代碼升冪、美股置底）

- **狀態**: Completed
- **GitHub Issue**: [#80](https://github.com/judragon003/-/issues/80)
- **規格書**: [SPEC-0009](../../docs/specs/0009-holdings-natural-sorting-and-twse-scanner-fix.md)
- **架構決策**: [ADR-0009](../../docs/adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)

## 任務清單
- [x] 在 `src/engine/calculator.ts` 的 `calculateHoldingsAndSummary` 中，對返回的 `holdings` 陣列進行排序：
  1. 台股 (`market === 'TW'`) 在前，美股 (`market === 'US'`) 在後。
  2. 同市場內，使用 `a.symbol.localeCompare(b.symbol)` 自然升冪排序。
- [x] 在 `src/components/HoldingsTable.tsx` 中確保 `activeHoldings` 正確渲染排序結果。
- [x] 撰寫單元測試 `src/engine/calculator.test.ts`，驗證混合台股（如 00403A, 0050, 00981A, 2330, 9927）與美股（如 VT, AAPL）之排序正確性。
