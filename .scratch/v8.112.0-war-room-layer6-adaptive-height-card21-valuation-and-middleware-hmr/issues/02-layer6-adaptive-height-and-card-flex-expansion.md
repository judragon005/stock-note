# Ticket 02: 戰情室 Layer 6 高度升級至 minHeight 315px 與四卡垂直彈性空間展開

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0199](../../../docs/specs/0199-war-room-layer6-adaptive-height-institutional-valuation-percentile-and-middleware-hmr-spec.md)
- **關聯 Issue**：#310

## 任務目標
1. 將 `AiForceDashboardView.tsx` 中第二列容器（`data-layer="6-energy-sentiment"`）的寫死高度 `295px` 改為 `minHeight: '315px'`，四欄外層容器統一使用 `height: '100%'`。
2. 優化 `EnergySentimentTwinCard.tsx`、`DynamicSignalsCard.tsx`、`AiConfidenceCard.tsx` 內部的垂直 Flex 分佈（如 `justifyContent: 'space-between'`、間距自適應調整），避免卡片拉高後留白過大或文字擁擠。
3. 確保單元測試覆蓋卡片容器的高度樣式規則。
