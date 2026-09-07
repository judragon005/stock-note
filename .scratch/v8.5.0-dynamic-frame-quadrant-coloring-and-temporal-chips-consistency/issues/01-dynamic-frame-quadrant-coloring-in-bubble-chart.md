# 任務 01: 泡泡色彩 100% 綁定當前影格象限 (Dynamic Frame Quadrant Coloring)

- **狀態**: `completed`
- **優先級**: P0
- **完成說明**: placedBubbles 已動態映射 dynQuadrant，getBubbleFillColor 與 getBubbleStrokeColor 傳入當日真實象限，第三象限泡泡 100% 呈現冷灰藍色，徹底消除黃色錯亂。
- **目標**:
  1. 在 `SmartMoneyBubbleChart.tsx` 中，渲染泡泡實體時，以當前選取影格坐標動態判定其真實象限。
  2. 呼叫 `getBubbleFillColor` 與 `getBubbleStrokeColor` 時傳入當前影格象限，第三象限絕對顯示冰霜冷灰藍色，徹底消除黃色錯亂。
