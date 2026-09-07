# 產品需求規格書 (PRD)：動態影格象限色彩同步、象限邊界守門員與時序籌碼一致性修復 (v8.5.0)

## 1. 背景與痛點 (Background & Pain Points)

使用者在籌碼動態星圖中發現嚴重顏色錯亂 Bug：
- **痛點一：第三象限（左下角「❄️ 冷凍提款區」）出現黃色氣泡**。在坐標 $x < 0, y < 0$ 的冷凍提款區域，兆豐金 (2886) 等標的竟被渲染成第二象限的琥珀暖金色（黃色）。
- **根因剖析**：
  1. `SmartMoneyBubbleChart.tsx` 在時序播放或坐標排斥時，雖然更新了當日影格之坐標 $x$ 與 $y$，但泡泡物件的 `quadrant`（象限屬性）未隨影格動態重新計算，渲染顏色 (`getBubbleFillColor`) 依然讀取靜態初始象限。
  2. `smartMoneyEngine.ts` 象限判定中，當 $y = 0$ 且 $x < 0$ 時，`x < 0 && y >= 0` 將零動作標的誤判為 `ACCUMULATION`（逢低吃貨區，黃色）。
  3. 時序流向模擬在無法人數據時降級採用 `(todaysPnLPercent)/5`，使得下跌但法人實質大買的標的被拉下橫軸。

---

## 2. 目標與驗收條件 (Goals & Acceptance Criteria)

### AC-1: 泡泡色彩 100% 綁定當前影格象限 (Dynamic Frame Quadrant Coloring)
- `SmartMoneyBubbleChart.tsx` 渲染泡泡時，其 `fillColor` 與 `strokeColor` 必須使用當前選定影格的真實象限（透過 `getTemporalBubbleFrameData(b, currentDateIndex).quadrant` 計算得出）。
- **嚴格驗證**：只要泡泡物理位置處於第三象限（$x < 0, y < 0$），顏色絕對是冰霜灰藍色 (`rgba(100, 116, 139, 0.4)` / `#94a3b8`)，**100% 杜絕出現任何黃色**。

### AC-2: 象限零軸邊界守門員 (Strict Quadrant Boundary Guard)
- 在 `smartMoneyEngine.ts` 中修正象限判定條件：
  - 第一象限 `BREAKOUT`：$x > 0$ 且 $y > 0$（嚴格正值）
  - 第二象限 `ACCUMULATION`：$x < 0$ 且 $y > 0$（價跌且籌碼大買）
  - 第四象限 `DISTRIBUTION`：$x > 0$ 且 $y < 0$（價漲且機構倒貨）
  - 第三象限 `LIQUIDATION`：$x < 0$ 且 $y < 0$（價跌且機構撤退）
  - 邊界中立區（$y = 0$）：若 $x < 0$，歸類為 `LIQUIDATION` 或中立冷清區，絕不誤判為 `ACCUMULATION` 吸籌。

### AC-3: 時序歷史流向增量對齊真實資料
- 當 `twseData` 存在時，時序歷史流向優先以真實三大法人數據為基準；若無數據時，維持中立零軸推移，避免因單日跌幅將標的誤拽入倒貨區。

---

## 3. 架構設計與邊界條件 (Architecture & Edge Cases)

- **KISS 原則**：不增加複雜狀態，利用純函數將「當前影格象限」作為派生屬性直接傳入色彩函數。
- **一致性保證**：頂部卡片數量、Tooltip 浮窗象限徽章、泡泡畫布物理位置、泡泡外觀顏色四者具備 100% 數學與視覺一致性。
