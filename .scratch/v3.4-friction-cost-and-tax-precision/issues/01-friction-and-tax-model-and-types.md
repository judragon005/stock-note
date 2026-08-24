# Ticket #1: [Data/Model] 交易稅率性質分類與美股股息預扣稅資料模型擴充

- **狀態**: Completed
- **規格書**: [SPEC-0017](../../../docs/specs/0017-friction-cost-and-tax-precision-engine.md)
- **架構決策**: [ADR-0017](../../../docs/adr/0017-friction-cost-and-tax-precision-engine.md)

## 任務清單
- [x] 在 `src/types/stock.ts` 中新增 `TaxRateCategory` 型別（包含 `STOCK_REGULAR`, `DAY_TRADING`, `STOCK_ETF`, `BOND_ETF_TAX_FREE`, `CUSTOM`）。
- [x] 在 `src/types/stock.ts` 的 `FrictionSummary` 介面中新增 `totalUSDividendTax?: number` 欄位。
- [x] 在 `src/types/stock.ts` 的 `TradeRecord` 介面中新增可選的 `taxRateCategory?: TaxRateCategory` 欄位。
- [x] 確保既有資料載入相容性與 TypeScript 類型檢查 0 錯誤。
