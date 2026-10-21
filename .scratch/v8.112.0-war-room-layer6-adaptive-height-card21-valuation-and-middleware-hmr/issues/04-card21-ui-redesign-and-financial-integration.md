# Ticket 04: 21 號卡片視覺重構：歷史倍數光譜條與單季財報 (EPS/毛利率) 自適應展示

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0199](../../../docs/specs/0199-war-room-layer6-adaptive-height-institutional-valuation-percentile-and-middleware-hmr-spec.md)
- **關聯 Issue**：#310

## 任務目標
1. 重構 `ValuationMetricsCard.tsx`：
   - 頂部展示歷史分位數評級徽章（如：「歷史合理 (PR 54%)」或「歷史偏高 (PR 88%)」）。
   - 中部展示自身長期歷史倍數分佈：`歷史區間: Min x (低) — Median x (中位) — Max x (高)`。
   - 底部充分運用拉高後的高度，自適應渲染單季獲利基石膠囊徽章（`2024Q3 EPS: X元`、`毛利率: Y%`、`營利率: Z%`）。
2. 在 `AiForceDashboardView.tsx` 中確保湖倉資料與即時數據雙向合流，徹底告別 `--`。
3. 撰寫單元測試覆蓋卡片在正常有數據、無數據、虧損轉機等情境之渲染。
