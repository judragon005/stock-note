# Ticket #2: [Formatters/TDD] 多幣別與券商慣用精度格式化模組與單元測試

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0021](../../../docs/specs/0021-layout-swap-and-broker-grade-currency-precision.md)
- **架構決策**: [ADR-0021](../../../docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)

## 任務清單
- [x] 建立 `src/utils/formatters.ts` 集中管理多幣別精度與字串格式化：
  - `calculateDividendCash`：台股 (TWD) 依集保慣例 `Math.floor` 取整；美股 (USD) 依券商慣例四捨五入至 2 位小數，徹底消除 JS 浮點數溢位。
  - `normalizeCurrencyPrecision`：標準化數值精度（TWD 整數、USD 2 位小數）。
  - `formatCurrencyAmount`：輸出 `NT$ X,XXX` 或 `$X.XX USD`。
  - `formatTimelineDividend` / `formatTimelineReduction`：專職處理時間軸除息與減資退款文本。
  - `formatSharesCount`：支援台股整數股與美股碎股（最多 4 位小數）。
- [x] 建立 `src/utils/formatters.test.ts` 撰寫完整單元測試（涵蓋永豐金、VT、國巨邊界與浮點數案例），10 組測試 100% 綠燈。
