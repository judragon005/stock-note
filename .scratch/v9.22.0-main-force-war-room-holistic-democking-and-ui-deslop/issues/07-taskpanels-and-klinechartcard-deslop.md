# Issue 07: 5 大任務面板與 KLineChartCard 曜石去 Slop 視覺與真實多週期重算

- **層級**: 前端元件 / 圖表與任務面板
- **關聯規格**: Spec 0237 Ticket 7 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 重構 `src/components/aiforce/TaskPanels.tsx`，任務二壓力測試改連真實持倉與大盤維持率；任務三週/月 KD 改為真實 K 線聚合重算，低檔金叉無樣本時誠實顯示 0 次。
2. 重構 `src/components/aiforce/cards/KLineChartCard.tsx`，全面曜石精密化，切換週 K / 月 K 時觸發指標重新聚合，根除系統 Emoji。
