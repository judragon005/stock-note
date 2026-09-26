# ADR 0142: AI 主力戰情室主 K 線動態查價列常駐無抖動與游標磁吸邊界守護架構

- **狀態**：Accepted
- **日期**：2026-09-26
- **關聯規格**：[Spec 0142 (docs/specs/0142-ai-force-interactive-tooltip-and-anti-layout-shift-spec.md)](../specs/0142-ai-force-interactive-tooltip-and-anti-layout-shift-spec.md)
- **關聯 Issue**：[#100](https://github.com/judragon005/stock-note/issues/100)

---

## 背景與脈絡 (Context)

在 AI 主力戰情室 01 主 K 線升級為高互動性圖表後，使用者在懸停游標進行技術指標查價時面臨以下實體互動問題：
1. **條件渲染導致的版面劇烈抖動 (Layout Shift Anti-Pattern)**：原本狀態列僅在 `hoveredCandle !== null` 時渲染，滑鼠進出圖表時狀態列隨之顯示與銷毀，造成下方 SVG 圖表區域頻繁上下位移推擠，使用者體驗不良。
2. **極端座標除零與負數無效存取風險**：當滑鼠移至圖表最邊緣或在異常極小寬度（`candleGap <= 0`）與空資料數列（`totalCount <= 0`）時，吸附演算法若未做防禦性截斷，會引發 `NaN` 座標或陣列 `undefined` 存取異常。

---

## 決策內容 (Decisions)

1. **常駐型無抖動查價狀態列容器 (Persistent Anti-Layout-Shift Container)**：
   - 狀態列固定佔位（`minHeight: '26px'`），無論滑鼠是否懸停均維持容器高度。
   - **狀態自適應回退機制 (Active Candle Fallback)**：
     - 當滑鼠未懸停（`isHovering === false`）：狀態列自動顯示最後一筆最新交易日報價與指標，標註 `[📌 最新]` 徽章。
     - 當滑鼠懸停於畫布（`isHovering === true`）：無縫切換為當前吸附交易日之 OHLCV、均線、KD、MACD、RSI，標註 `[🔍 查價]` 徽章與發光邊框。
2. **純函式吸附演算法與邊界強化 (findClosestCandleIndex Guard)**：
   - 當 `totalCount <= 0` 時強制回傳 `-1`，杜絕呼叫端存取無效陣列元素。
   - 當 `candleGap <= 0` 時強制回傳 `0`，杜絕除以零產生的數值溢出。
   - 採用以 K 棒中心對稱之二分索引吸附，確保滑鼠在左右半徑內均可穩定對齊。
3. **單元測試縫隙驗證 (Test Seams)**：
   - 於 `KLineChartCard.test.ts` 新增空陣列與零間隙防禦測試，納入 CI 強制綠燈管制。

---

## 後果與影響 (Consequences)

- **正面效益**：
  - 徹底解決圖表滑鼠懸停時的版面跳動問題，查價體驗流暢專業。
  - 在未懸停狀態下，使用者仍能立即掌握最新交易日的全套指標細節，提升資訊密度。
  - 吸附演算法具備數學邊界防禦，絕不在極端邊緣情況下崩潰。
- **後續維護**：
  - 狀態列寬度已支援 `flexWrap: 'wrap'`，在窄螢幕裝置上將自動折行顯示。
