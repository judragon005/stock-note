# Ticket #1: [Engine] 手續費折讓率參數化配置與在倉成本精確校準引擎實作 (TDD)

- **狀態**: Completed
- **GitHub Issue**: [#91](https://github.com/judragon003/-/issues/91)
- **規格書**: [SPEC-0012](../../../docs/specs/0012-broker-fee-discount-and-cost-basis-alignment.md)
- **架構決策**: [ADR-0012](../../../docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)

## 任務清單
- [x] 在 `src/engine/calculator.ts` 中升級 `calculateEstimatedSellFee` 與 `calculateHoldingsAndSummary`，支援自訂 `discountRate` 參數。
- [x] 實作在倉成本校準與歷史手續費退佣沖抵計算邏輯，確保總付出成本在券商模式下能精準對齊至 `11,141,644`。
- [x] 撰寫單元測試 `calculator.test.ts`，驗證在不同折讓率（1.0 / 0.6 / 0.28）下淨市值與成本之精準度。
