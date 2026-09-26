# 規格 0144：AI 主力戰情室卡片 06 與 07 照片精準對齊、動態波形面積圖與雙色發散錐規格 (Spec 0144)

## Problem Statement

經由對齊標準設計照片對「AI 主力行為判讀系統」全盤 21 個功能方塊進行逐項查驗，發現戰情室中存在局部嚴重失真與實作脫節問題，特別是照片以紅框圈選的兩大核心量化圖表（卡片 06 與卡片 07）：

1. **卡片 06（累積型 AI 預測路徑圖）視覺色彩與座標刻度失真**：
   - 扇形預測發散錐目前採用單一全局的藍紫漸層填充，與上方圖例「紅色：上漲機率 47%、黃色：震盪機率 11%、綠色：下跌機率 42%」完全脫鉤，無法讓交易者在視覺上一眼分辨上漲與下跌區域。
   - 缺失左側 Y 軸價格數值刻度（如 2500, 2000）與水平參考網格線，導致使用者無法得知未來 3/5/10 日的預期價位波動區間。
   - 底部「主力方向機率：多頭 52%」文字硬編碼為天藍色，未對齊台股多頭標準鮮紅色。

2. **卡片 07（主力成本結構分佈圖）核心圖表為假 Mock 貝茲曲線**：
   - 核心波形圖目前由 4 條寫死的靜態 SVG `<path>` 構成，既非真實堆疊面積圖，亦不隨個股歷史日 K 與成交量變化而動態計算，換代碼時圖形完全無反應。
   - 圖例定義分裂：引擎產出「突破區、大量成交區、主力成本區、套牢區」，與照片標準「倉儲區 (>5%)、套牢區 (-2~-5%)、主力成本區 (±2%)、大量成交區 (±2~5%)」在名詞與色階上均不一致。
   - 卡片標題錯寫為「分布圖」而非照片中的「分佈圖」；底部「強弱指標：+7.5%」色彩與照片的天藍色標準有偏差。

3. **卡片 09（隔日沖風險分析）文案細節微偏**：
   - 第 2 項指標文案錯寫為「籌碼過手率」，照片標準文案應為「**籌碼換手率**」。

## Solution

依據真實日 K (OHLCV) 量化模型與標準設計照片，實作卡片 06 與 07 的精準還原與動態化升級：

1. **卡片 06 雙色發散扇形錐與價格座標軸體系**：
   - **雙層發散面幾何計算**：以中央黃色中位數曲線 (`medianPoints`) 為界，向上與上邊界曲線 (`upperPoints`) 閉合成「上漲發散扇形」，填充紅色/橙色半透明漸層；向下與下邊界曲線 (`lowerPoints`) 閉合成「下跌發散扇形」，填充翠綠色半透明漸層，完美契合圖例。
   - **動態 Y 軸價位標籤與格線**：自歷史與預測極值動態計算主要價位刻度（如 2500、2000），在左側渲染標籤文字與微弱水平參考線。
   - **色彩與多空指標校準**：將底部主力方向機率標籤依多空方向動態映射色彩（多頭為鮮紅色 `#ef4444`）。

2. **卡片 07 真實多時段多層堆疊波形面積圖 (Stacked Mountain Chart)**：
   - **歷史成本帶時序量化引擎升級**：在 `vwapCostEngine` 中建立時間序列採樣演算法，基於近 60 日歷史日 K 採樣 4 個時點（如 06/25, 07/10, 08/10, 08/31），計算各時點相對於當時 20 日 VWAP 的 4 階成本帶成交量分佈（倉儲區 >5%、套牢區 -2~-5%、主力成本區 ±2%、大量成交區 ±2~5%）。
   - **真實平滑堆疊面積 SVG 繪製**：依據真實 4 個時點之量能累積高度（0~60k），使用三次貝茲曲線產生 4 層堆疊閉合路徑，自上而下呈現「橙黃 ➔ 翠綠 ➔ 天藍 ➔ 深藍」之起伏山峰。
   - **圖例與名詞統一**：右上圖例文字、百分比與色塊嚴格對齊照片；標題校正為「07 主力成本結構分佈圖」；底部強弱指標色彩對齊天藍色。

3. **卡片 09 文案精準校正**：
   - 將第 2 項指標標籤統一修正為「**籌碼換手率**」。

## User Stories

1. As a visual trader, I want card 06's prediction cone to be visually divided into a red upper region and a green lower region, so that I can immediately discern bullish drift probability from bearish risk at a glance.
2. As a technical swing trader, I want card 06 to feature readable Y-axis price levels (such as 2500 and 2000), so that I can calibrate exact price targets and stop-loss zones for 3/5/10 days ahead.
3. As a quantitative analyst, I want card 06's main force direction badge to display in red for bullish scenarios, so that color semantics remain intuitive and aligned with Taiwan market standards.
4. As an institutional tracker, I want card 07's cost structure chart to be rendered dynamically from the security's actual 60-day price-volume distribution rather than static mock curves, so that the chart reflects true volume clusters across historical dates.
5. As an investor studying chips, I want card 07 to display 4 distinct stacked mountain layers representing Holding/Inventory (>5%), Trapped (-2~-5%), Main Cost (±2%), and Heavy Volume (±2~5%), so that I can understand where major capital is anchored.
6. As a trader verifying data, I want card 07 to show volume scale marks (60k, 40k, 20k, 0k) on the Y-axis and chronological date ticks (e.g. 06/25, 07/10, 08/10, 08/31) on the X-axis, so that time and volume dimensions are unambiguous.
7. As a precision-oriented user, I want card 07's legend and title to strictly match the reference design ("07 主力成本結構分佈圖"), so that terminology across the platform is professional and standardized.
8. As a day-trade risk monitor, I want card 09's second metric to be labeled "籌碼換手率" instead of "籌碼過手率", so that standard financial jargon is preserved.

## Implementation Decisions

### 1. Card 06 Forecast Cone Dual-Path & Axis Architecture
- **Dual-Cone Geometry Function**:
  - `buildSplitConePaths(upperPoints, medianPoints, lowerPoints)`:
    - `bullPath`: Starts at `upperPoints[0]`, traces `upperPoints` forward, links to `medianPoints` reversed, closes with `Z`.
    - `bearPath`: Starts at `medianPoints[0]`, traces `medianPoints` forward, links to `lowerPoints` reversed, closes with `Z`.
  - SVG Defs:
    - `<linearGradient id="bullConeGrad">`: Stop 0% `#ef4444` (opacity 0.35) ➔ 100% `#f97316` (opacity 0.08).
    - `<linearGradient id="bearConeGrad">`: Stop 0% `#10b981` (opacity 0.35) ➔ 100% `#047857` (opacity 0.08).
- **Y-Axis Ticks Generator**:
  - Derive round price levels spanning `minPrice` to `maxPrice` (e.g. step of 100 or 500), projecting to Y coordinates with left-aligned `<text>` and light horizontal dashed `<line>`.
- **Directional Metric Theme**:
  - Update `mainForceDirectionProb` color binding: Red `#ef4444` for Bullish (多頭), Green `#10b981` for Bearish (空頭).

### 2. Card 07 Dynamic VWAP Stacked Mountain Engine & Card Architecture
- **Engine Data Structure Expansion (`vwapCostEngine.ts`)**:
  - Introduce `TimeNodeCostBands`:
    ```typescript
    export interface CostBandNode {
      dateLabel: string; // e.g. "06/25", "07/10", "08/10", "08/31"
      inventoryVol: number;  // 倉儲區 (>5%)
      trappedVol: number;    // 套牢區 (-2~-5%)
      costVol: number;       // 主力成本區 (±2%)
      heavyVol: number;      // 大量成交區 (±2~5%)
      totalVolume: number;
    }
    ```
  - Sample 4 evenly-spaced anchors from the last 60 candles to compute `timeNodes: CostBandNode[]`.
- **Smooth Stacked SVG Path Construction**:
  - Build cumulative stacked curve coordinates for each tier from bottom to top:
    - Layer 4 (Deep Blue `#1e40af`): Heavy Volume
    - Layer 3 (Cyan `#38bdf8`): Main Cost
    - Layer 2 (Emerald `#10b981`): Trapped
    - Layer 1 (Amber/Orange `#f97316`): Inventory/Breakout
  - Use cubic Bezier smoothing `M ... C ... L ... Z` to render undulating peaks.
- **Card Metadata Alignment**:
  - Update legend to 4 items: `倉儲區(>5%)`, `套牢區(-2~-5%)`, `主力成本區(±2%)`, `大量成交區(±2~5%)`.
  - Fix title spelling: `07 主力成本結構分佈圖`.
  - Fix strong bias text color: cyan `#38bdf8` for positive drift alignment with the photo.

### 3. Card 09 Vocabulary Refinement
- Update `DayTradeRiskCard.tsx` items: change label from `籌碼過手率` to `籌碼換手率`.

## Testing Decisions

### Good Test Principles
- Test behavior at public seams: pure math/path generators and rendered DOM elements (labels, paths, gradients, text colors).
- Verify numerical edge cases: candle counts fewer than 4, zero trading volume, zero price variance.

### Target Test Seams
1. **Forecast Cone Geometry Seam**: `ForecastConeCard.test.ts`
   - Test that `buildSplitConePaths` correctly produces both `bullPath` and `bearPath`.
   - Test that Y-axis price labels exist and reflect the calculated price range.
   - Test that the bullish direction label adopts the `#ef4444` theme.
2. **VWAP Cost Mountain Engine Seam**: `vwapCostEngine.test.ts` & `VwapCostStructureCard.test.ts`
   - Test that `calculateVwapCostStructure` outputs 4 valid `CostBandNode` time nodes with non-zero volume distributions.
   - Test that SVG paths in `VwapCostStructureCard` are dynamically generated based on node inputs rather than static hardcoded strings.
   - Test that legend labels match `倉儲區(>5%)`, `套牢區(-2~-5%)`, `主力成本區(±2%)`, `大量成交區(±2~5%)`.
3. **Day Trade Risk Seam**: `DayTradeRiskCard.test.ts`
   - Verify that the rendered label is `籌碼換手率`.

### Prior Art
- `ForecastConeCard.test.ts`: existing SVG projection tests.
- `VolumeProfileCard.test.ts`: bucket percentage and style calculation tests.

## Out of Scope

- Real-time WebGL 3D surface rendering for cost distributions.
- Intraday tick-by-tick orderbook market-depth volume profiling.
- External interactive drawing tools (pencils, Fibonacci retracements) on card 06/07.

## Further Notes

- All changes maintain 100% backward compatibility with `AiForceDashboardReport` and existing test suites.
- Ensures zero layout shift across responsive breakpoints.
