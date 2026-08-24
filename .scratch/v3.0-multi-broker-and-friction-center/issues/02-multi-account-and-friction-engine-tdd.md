# Ticket #2: [Engine] 多帳戶持倉聚合運算與交易摩擦成本深度分析引擎 (TDD)

- **狀態**: Completed
- **規格書**: [SPEC-0013](../../../docs/specs/0013-multi-broker-account-and-friction-cost-engine.md)
- **架構決策**: [ADR-0013](../../../docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)

## 任務清單
- [ ] 在 `src/engine/calculator.ts` 中升級 `calculateHoldingsAndSummary`，支援傳入 `accounts: BrokerAccount[]` 與 `selectedAccountId: 'ALL' | string`：
  - 支援單一券商帳戶過濾與精準費率計算。
  - 預估賣出稅費直接依照該標的所屬券商帳戶之折讓率、低消與稅率精確計算。
- [ ] 實作專屬摩擦成本統計函式 `calculateFrictionCostSummary(trades, holdings, accounts)`：
  - 歷史累計買進手續費 `totalBuyFee`
  - 歷史累計賣出稅費 `totalSellFee` & `totalSellTax`
  - 券商折讓累計節省金額 `totalFeeSavedByDiscount`
  - 在倉持股預估未來出清摩擦成本 `totalEstimatedFutureFriction`
  - 摩擦成本衝擊佔比 `frictionImpactPercent`
- [ ] 撰寫單元測試 `src/engine/calculator.test.ts`，驗證多帳戶過濾、獨立費率計算與摩擦成本公式之精確度。
