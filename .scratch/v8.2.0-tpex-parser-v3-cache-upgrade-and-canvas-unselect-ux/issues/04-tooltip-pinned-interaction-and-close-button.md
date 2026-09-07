# Ticket 04: Tooltip 浮窗固定模式指針穿透配置與 ✕ 快捷關閉按鈕

- **狀態**：CLOSED (RESOLVED)
- **類型**：`type:ui-enhancement`
- **領域**：`area:ui`
- **優先級**：`priority:medium`
- **標流標籤**：`ready-for-agent`

## 需求描述
更新 `calculateTooltipPlacement` 支援 `isPinned` 參數，使卡片固定時具備 `pointerEvents: 'auto'`；卡片內部點擊呼叫 `e.stopPropagation()` 避免誤關閉；並在右上角新增顯著直覺的「✕」關閉按鈕。

## 驗收條件
1. 懸浮 (Hover) 模式下卡片 `pointerEvents: 'none'`，固定模式下 `pointerEvents: 'auto'`。
2. 點擊 ✕ 按鈕能重置 `selectedBubble` 為 `null` 關閉卡片。
3. 單元測試完整覆蓋 pointerEvents 切換邏輯。
