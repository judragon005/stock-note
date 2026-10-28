# 01 — 時間除數校準 (days/365.25)、下行波動度與 Sortino 比率純函式

**What to build:**
校準量化風控核心算法中日曆天除數錯位的問題。將日曆天序列之年數計算從 `days / 252` 修正為 `days / 365.25`，解決 1 整年（365天）被判定為 1.45 年導致 CAGR 與 Sharpe 比率被失真閹割 30% 以上的嚴重錯誤。同時實作計算下行波動度 (`calculateDownsideVolatility`) 與索提諾比率 (`calculateSortinoRatio`) 之純函式，擴充 `QuantPerformanceMetrics` 型別，專注懲罰下行虧損風險而不懲罰飆股向上衝刺。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 在 `src/engine/quantMetrics.ts` 中修正年數計算為 `const years = Math.max(days / 365.25, 1 / 365.25)`
- [x] 實作純函式 `calculateDownsideVolatility(dailyReturns: number[]): number`
- [x] 實作純函式 `calculateSortinoRatio(annualizedReturnPercent: number, downsideVolatilityPercent: number, riskFreeRatePercent?: number): number`
- [x] 擴充 `QuantPerformanceMetrics` 型別新增 `sortinoRatio?: number` 與 `downsideVolatility?: number`
- [x] 在 `src/engine/quantMetrics.test.ts` 撰寫單元測試驗證 365 天長度時年數計算為 1.0 年，且 Sortino 數值計算精確
