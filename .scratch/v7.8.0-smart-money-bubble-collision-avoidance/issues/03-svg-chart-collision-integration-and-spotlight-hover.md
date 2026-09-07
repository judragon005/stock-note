# Issue #03: SVG 圖表接入防碰撞坐標、DOM 置頂與滑鼠聚光燈高亮

## 狀態
`ready-for-agent`

## 說明
修改 `SmartMoneyBubbleChart.tsx`：
1. 調用 `resolveBubbleCollisions` 計算無重疊之渲染坐標 $(cx, cy)$。
2. 接入滑鼠懸浮狀態管理，當 Hover 某泡泡時，將該泡泡排至 SVG 子元素陣列最後（使其在 SVG 圖層頂部渲染，不受遮蔽）。
3. 聚光燈模式：當有泡泡被選中/懸浮時，其餘泡泡透明度設為 0.25，選中泡泡維持 1.0 並帶有呼吸外發光效果。

## 驗收條件 (Acceptance Criteria)
1. 泡泡以防碰撞後的真實像素位置呈現。
2. 懸浮泡泡永遠位於最上層，代碼與 Tooltip 零遮蔽。
3. 支援流暢 CSS transition，不突兀跳躍。
4. 元件既有測試與新增測試 100% 通過。
