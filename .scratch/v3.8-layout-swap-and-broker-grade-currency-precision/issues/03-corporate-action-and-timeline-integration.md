# Ticket #3: [Integration] 公司行動掃描器、補登彈窗與持倉時間軸多幣別格式化全域連動

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0021](../../../docs/specs/0021-layout-swap-and-broker-grade-currency-precision.md)
- **架構決策**: [ADR-0021](../../../docs/adr/0021-layout-swap-and-broker-grade-currency-precision.md)

## 任務清單
- [x] 更新 `src/engine/corporateActionScanner.ts`：
  - 在除息與減資事件計算底層直接呼叫 `calculateDividendCash` 與 `normalizeCurrencyPrecision`，避免來源端資料失真。
- [x] 更新 `src/components/CorporateActionScannerModal.tsx`：
  - 待補登清單項目、預估入帳彙總統計全面導入 `formatCurrencyAmount` 與 `formatSharesCount`。
  - 一鍵補登產出 `TradeRecord` 之 `cashAmount` 與 `note` 套用標準精度。
- [x] 更新 `src/components/HoldingsTable.tsx`：
  - 個股展開之完整歷史時間軸套用 `formatTimelineDividend` 與 `formatTimelineReduction`，移除硬編碼 `${...} 元`。
