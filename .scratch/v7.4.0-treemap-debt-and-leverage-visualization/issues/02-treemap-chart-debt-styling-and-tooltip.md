---
title: "Ticket 02: TreemapChart 借款節點琥珀警示風格與多合約明細 Tooltip"
labels: ["completed", "engineering"]
---

## 🎯 任務目標
在 `TreemapChart.tsx` 中為借款節點賦予高對比琥珀警示樣式，並於滑鼠懸浮時呈現多層次結構化借貸合約資訊。

## 📋 驗收條件 (Acceptance Criteria)
- [x] 1. 借款節點使用專屬琥珀配色（`hsla(38, 92%, 50%, 0.85)` / `#f59e0b`）與深琥珀邊框，不受漲跌色調（紅/綠）主題切換影響。
- [x] 2. 樹狀圖節點內文字清晰呈現 `🏦 借貸負債`、總負債金額與年化成本標註。
- [x] 3. 懸浮 Tooltip 能展示總負債、年利率以及當前各合約細項列表。
