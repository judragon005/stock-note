# Subtask 02: P2-01/02 TaxComparison 語義修正與 P2-03 Modal useMemo 效能快取

- **父任務**：[issue-0036.md](issue-0036.md)
- **狀態**：`READY_FOR_DEV`
- **分流標籤**：`ready-for-agent`
- **優先級**：`P2`

## 任務目標
1. 於 `src/engine/lotEngine.ts` 的 `calculateTaxComparison` 函式中：
   - 擴充傳入 `currentPrices` 參數。
   - 修正未實現損益欄位運算，正確累加 `(lot.remainingShares * curPrice) - lot.totalCostBasis`，並正確命名 `remainingCostBasis`。
2. 於 `src/components/LotsBreakdownModal.tsx` 中：
   - 使用 `useMemo` 快取 `processLots(symbolTrades)` 與 `calculateTaxComparison(symbolTrades)`，避免分頁切換時重複執行 5 次運算。
