# Ticket #1: [Engine/TDD] 台股二代健保 2.11% 門檻判定與美股 30% 預扣稅雙軌計算與單元測試

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0020](../../../docs/specs/0020-dividend-tax-and-withholding-tracking.md)
- **架構決策**: [ADR-0020](../../../docs/adr/0020-dividend-tax-and-withholding-tracking.md)

## 任務清單
- [x] 檢視 `src/types/stock.ts` 中 `FrictionSummary` 結構，確認 `totalTWDividendTax`、`totalUSDividendTax`、`totalUSDividendTaxInTWD` 之型別與註記。
- [x] 在 `src/engine/calculator.ts` 的 `calculateFrictionCostSummary` 中確保精準度：
  - 台股現金股息：單筆 $\ge 20,000$ 扣 $2.11\%$，未達 20,000 免扣；自訂 `tax > 0` 優先採用。
  - 美股現金股息：固定 $30\%$ Withholding Tax；自訂 `tax > 0` 優先採用；原幣與台幣折算雙軌提供。
- [x] 在 `src/engine/calculator.test.ts` 中撰寫完整的單元測試：
  - 驗證台股股息 19,999 元（二代健保 0 元）與 20,000 元（二代健保 422 元）邊界值。
  - 驗證美股股息 30% 預扣稅與 USD/TWD 匯率折算。
  - 驗證手動自訂 `tax` 之優先權。
