# Ticket #2: [Engine/TDD] 摩擦成本多幣別匯率換算與除權息二代健保/美股預扣稅引擎

- **狀態**: TODO
- **規格書**: [SPEC-0018](../../../docs/specs/0018-tax-fee-auto-repair-and-currency-engine.md)
- **架構決策**: [ADR-0018](../../../docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)

## 任務清單
- [ ] 在 `calculateFrictionCostSummary` 中引入 `usdRate: number = 32.0`。
- [ ] 將美股買進手續費、賣出手續費與規費乘以 `usdRate` 換算為 TWD 累計至總摩擦看板。
- [ ] 納入台股現金股利單筆 $\ge 20,000$ 元之 2.11% 二代健保補充保費累計。
- [ ] 納入美股現金股利 30% 預扣稅並依 `usdRate` 換算為 TWD。
- [ ] 擴充 `FrictionSummary` 介面支援 `totalTWDividendTax`（二代健保）與 `totalUSDividendTax`。
- [ ] 撰寫單元測試驗證多幣別匯率折算與除權息摩擦計算。
