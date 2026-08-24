# Ticket #2: [Engine/TDD] 精準摩擦成本、法定牌告低消折讓基準與債券 ETF 免稅判斷引擎

- **狀態**: Completed
- **規格書**: [SPEC-0017](../../../docs/specs/0017-friction-cost-and-tax-precision-engine.md)
- **架構決策**: [ADR-0017](../../../docs/adr/0017-friction-cost-and-tax-precision-engine.md)

## 任務清單
- [x] 在 `src/engine/calculator.ts` 中升級 `calculateEstimatedSellTax`，精確識別結尾為 `B` 之債券型 ETF 稅率為 0%（免徵證交稅）、股票型 ETF 為 0.1%、一般股票為 0.3%、美股為 0%。
- [x] 在 `src/engine/calculator.ts` 中升級 `calculateFrictionCostSummary`，台股手續費折讓省下金額統一以法定標準牌告手續費基準 $\max(20, \lfloor \text{成交金額} \times 0.001425 \rfloor)$ 計算差額，徹底解決小額零股低消折讓被低估之問題。
- [x] 整合美股現金股利 30% 預扣稅（Withholding Tax）至已實現總摩擦成本與摩擦衝擊度比率計算中。
- [x] 在 `src/engine/calculator.ts` 中升級 `calculateTaiwanTax` 支援當沖 0.15% 與債券 ETF 0% 免稅參數。
- [x] 撰寫與更新 `src/engine/calculator.test.ts` 單元測試（紅-綠-重構 TDD 循環），100% 通過。
