# Issue 08: Zone 01 (即時決策與籌碼結構) 卡片曜石去 Slop 與接線

- **層級**: 前端元件 / Zone 01
- **關聯規格**: Spec 0237 Ticket 8 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 重構 Card 02 (AI決策解讀)、Card 03 (主力籌碼結構)、Card 04 (外資投信動向)、Card 05 (散戶籌碼指標)。
2. 移除所有裝飾性 `<MoreVertical />` 按鈕，根除 Emoji，曜石深邃底色與微高光邊框化。
3. 渲染 Card 02 `xaiExplanation`、動態判斷 `shortTermState` 與 `chipStructure`。
