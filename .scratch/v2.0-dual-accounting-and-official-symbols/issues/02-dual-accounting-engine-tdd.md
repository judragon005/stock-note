# Ticket #2: [Engine] 雙軌會計口徑計算模型與預估賣出稅費演算法實作 (TDD)

- **狀態**: Completed
- **GitHub Issue**: [#89](https://github.com/judragon003/-/issues/89)
- **規格書**: [SPEC-0011](../../../docs/specs/0011-dual-accounting-mode-and-official-symbols-alignment.md)
- **架構決策**: [ADR-0011](../../../docs/adr/0011-dual-accounting-mode-and-official-symbols-alignment.md)

## 任務清單
- [x] 在 `src/types/stock.ts` 中新增 `AccountingView = 'BROKER' | 'TOTAL_RETURN'` 類型，並擴充 `HoldingPosition`、`MarketSummary` 與 `CalculationResult` 介面欄位（包含 `grossMarketValue`, `estimatedSellTax`, `estimatedSellFee`, `netMarketValue`, `brokerCostBasis`, `unrealizedPnLBroker`, `totalReturnPnL` 等）。
- [x] 在 `src/engine/calculator.ts` 中實作預估賣出證交稅與手續費計算：
  - 現股賣出證交稅率：0.3%
  - ETF 賣出證交稅率：0.1%
  - 台股券商手續費率：0.1425% (預設 0.6 折，最低 20 元)
- [x] 實作雙軌會計數據計算：
  - 券商模式：不含息（純買入加權總付出成本）、含稅（扣除預估賣出稅費之淨變現值）。
  - 總回報模式：毛市值（未扣稅）、含息（價差 + 累計現金股利總損益與調降成本）。
- [x] 撰寫單元測試 `src/engine/calculator.test.ts`，驗證雙軌計算模型在台股、ETF、美股各種情境下的計算精確度。
