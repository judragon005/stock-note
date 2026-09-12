# Ticket 01: 全指標型別定義與純數學運算核心 (RSI, DMI/ADX, CCI, Williams %R, OBV, Fibonacci, Pivot)

## 狀態
- 狀態: `completed`
- 關聯規格: `docs/specs/0121-omni-technical-indicator-analysis-system-spec.md` (模組一、二)
- 關聯 Issue: #37
- 標籤: `enhancement,ready-for-agent`

## 任務目標
建立全指標型別定義文件 `src/types/omniIndicator.ts`，並在純函式核心 `src/engine/omniIndicatorEngine.ts` 內實作缺漏的技術指標數學純函式，具備 100% 無副作用與邊界除零防禦。

## 具體修改清單
1. **`src/types/omniIndicator.ts`**：
   - 定義 `TrendMetrics`, `MomentumMetrics`, `VolatilityMetrics`, `VolumeFlowMetrics`, `SupportResistanceLevels`, `TechnicalConfluence`, `OmniIndicatorReport` 完整介面。
2. **`src/engine/omniIndicatorEngine.ts`**：
   - 實作 `calculateRSI(closes: number[], period?: number)`（採 Wilder Smoothing 平滑法）。
   - 實作 `calculateDmiAdx(highs: number[], lows: number[], closes: number[], period?: number)`。
   - 實作 `calculateCCI(highs: number[], lows: number[], closes: number[], period?: number)`。
   - 實作 `calculateWilliamsR(highs: number[], lows: number[], closes: number[], period?: number)`。
   - 實作 `calculateOBV(closes: number[], volumes: number[])`。
   - 實作 `calculateFibonacciLevels(highs: number[], lows: number[])`。
   - 實作 `calculatePivotPoints(high: number, low: number, close: number)`。
3. **單元測試 (`src/engine/omniIndicatorEngine.test.ts`)**：
   - 針對上述 7 大純函式編寫 TDD 單元測試，比對標準理論數值。
   - 驗證 K 棒不足與極端行情（全平盤、零成交量）之容錯邊界。

## 驗收標準
- [ ] `src/engine/omniIndicatorEngine.test.ts` 測試案例全數通過 (100% 綠燈)。
- [ ] 執行時間小於 5ms，無任何運行時報錯。
