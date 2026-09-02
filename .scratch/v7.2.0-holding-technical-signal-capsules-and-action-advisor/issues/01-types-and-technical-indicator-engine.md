# Issue 01: 型別定義與純前端技術指標運算引擎 (Types & Technical Indicator Engine)

- **狀態**：`COMPLETED`
- **優先級**：`P1`
- **對應規格**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../../../docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)
- **標籤**：`ready-for-agent` · `Engine` · `Quant` · `TDD`

---

## 1. 任務目標
1. 建立 `src/types/signal.ts`，定義 `HoldingSignal`、`TechnicalIndicators`、`HoldingActionDirective`、`SignalCategory` 與 `SignalTone` 等核心資料模型。
2. 實作 `src/engine/technicalIndicatorEngine.ts`，提供以下純前端無依賴運算：
   - `calculateMovingAverages(prices: number[])`: MA5, MA20, MA60, MA120, MA240。
   - `calculateStochasticKD(highs: number[], lows: number[], closes: number[])`: KD(9,3,3) 與前日 K/D。
   - `calculateMACD(closes: number[])`: EMA12, EMA26, DIF, MACD9, MACD 柱狀體。
   - `calculateVolumeMetrics(volumes: number[])`: 昨日量、5日均量、20日均量、量能異動比。
   - `calculatePriceExtremes(highs: number[], lows: number[])`: 5日與20日高低點。
   - `extractHoldingSignals(currentPrice: number, indicators: TechnicalIndicators)`: 萃取多空、異動與位階標籤。
3. 編寫 `src/engine/technicalIndicatorEngine.test.ts`，達成 100% 測試覆蓋率（含邊界案例防禦：資料不足、空陣列、除零防禦）。

---

## 2. 驗收標準
- [ ] `src/types/signal.ts` 型別定義完整且無語法錯誤。
- [ ] `technicalIndicatorEngine.test.ts` 所有測試案例通過（`npm test` 綠燈）。
- [ ] 支援歷史 K 線不足（如僅 3 根 K 線）時優雅回退，不拋出 Exception。
