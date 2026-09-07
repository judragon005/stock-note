# Ticket 03: 畫布空白點擊取消選取與事件冒泡隔離機制

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:bugfix`
- **領域**：`area:ui`
- **優先級**：`priority:high`
- **標流標籤**：`ready-for-agent`

## 需求描述
在 `SmartMoneyBubbleChart.tsx` 主畫布容器與 `<svg>` 上綁定點擊清空選取處理，同時在泡泡節點 `<g>` 上加上 `e.stopPropagation()`，確保點擊空白處能即時重置 `selectedBubble` 為 `null`，且選中泡泡時不被畫布事件誤清空。

## 驗收條件
1. 點擊標的泡泡選取後，點擊畫布任意空白處能立即清空選取，卡片順暢消失。
2. 點擊標的泡泡時，事件不會冒泡至外層容器。
