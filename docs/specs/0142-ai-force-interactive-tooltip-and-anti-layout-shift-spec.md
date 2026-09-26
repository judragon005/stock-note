# 規格 0142：AI 主力戰情室主 K 線動態查價列常駐無抖動與游標磁吸邊界守護規格 (Spec 0142)

## Problem Statement

在 AI 主力戰情室 01 主 K 線升級為高互動性圖表後，使用者在懸停游標進行技術指標查價時面臨以下實體互動問題：
1. **條件渲染導致的版面劇烈抖動 (Layout Shift Anti-Pattern)**：原本狀態列僅在 `hoveredCandle !== null` 時渲染，滑鼠進出圖表時狀態列隨之顯示與銷毀，造成下方 SVG 圖表區域頻繁上下位移推擠，使用者體驗不良。
2. **極端座標除零與負數無效存取風險**：當滑鼠移至圖表最邊緣或在異常極小寬度（`candleGap <= 0`）與空資料數列（`totalCount <= 0`）時，吸附演算法若未做防禦性截斷，會引發 `NaN` 座標或陣列 `undefined` 存取異常。

## Solution

1. **常駐型無抖動查價狀態列容器 (Persistent Anti-Layout-Shift Container)**：
   - 狀態列固定佔位（`minHeight: '26px'`），無論滑鼠是否懸停均維持容器高度，徹底根絕版面抖動。
   - **狀態自適應回退機制 (Active Candle Fallback)**：
     - 當滑鼠未懸停（`isHovering === false`）：狀態列自動顯示最後一筆最新交易日報價與指標，標註 `[📌 最新]` 徽章。
     - 當滑鼠懸停於畫布（`isHovering === true`）：無縫切換為當前吸附交易日之 OHLCV、均線、KD、MACD、RSI，標註 `[🔍 查價]` 徽章與發光邊框。
2. **純函式吸附演算法與邊界強化 (findClosestCandleIndex Guard)**：
   - 當 `totalCount <= 0` 時強制回傳 `-1`，杜絕呼叫端存取無效陣列元素。
   - 當 `candleGap <= 0` 時強制回傳 `0`，杜絕除以零產生的數值溢出。
   - 採用以 K 棒中心對稱之二分索引吸附，確保滑鼠在左右半徑內均可穩定對齊。
3. **單元測試縫隙驗證 (Test Seams)**：
   - 於 `KLineChartCard.test.ts` 新增空陣列與零間隙防禦測試，納入 CI 強制綠燈管制。

## User Stories

1. As a technical trader, I want the candlestick inspection header to remain present with fixed height whether my mouse is hovering or not, so that the underlying chart does not jitter or jump up and down.
2. As a chart analyst, I want the inspection bar to show the latest close price, volume, and indicators when not hovering, so that I can see the primary metrics at a glance without moving my mouse.
3. As an active inspector, I want the inspection bar to seamlessly switch to hovered candle data with a distinct '[🔍 查價]' badge and border glow, so that I immediately know which trading day I am examining.
4. As a developer, I want `findClosestCandleIndex` to safely return `-1` on empty datasets and `0` on zero or negative candle gaps, so that edge cases never trigger `NaN` or unhandled index out-of-bounds exceptions.

## Implementation Decisions

- **State Normalization**: Introduce `isHovering` boolean and `activeCandle` computed entity, eliminating conditional container unmounting.
- **CSS Stability**: Assign `minHeight: '26px'` and `flexWrap: 'wrap'` to the inspection bar container, guaranteeing seamless responsiveness on narrower viewports.
- **Algorithm Defensiveness**: Guard division by `candleGap <= 0` and array bounds `totalCount <= 0` inside `findClosestCandleIndex`.

## Testing Decisions

- **Seam**: `src/components/aiForceDashboard/cards/KLineChartCard.test.ts`.
- **Coverage**:
  - `findClosestCandleIndex` handles negative coordinates, right-edge clamping, `totalCount <= 0`, and `candleGap <= 0`.
  - Visual inspection confirms zero layout shifting when mouse enters and leaves the SVG chart area.

## Out of Scope

- Multi-touch pinch-to-zoom gestures (this spec targets mouse hover inspection and layout stability).
