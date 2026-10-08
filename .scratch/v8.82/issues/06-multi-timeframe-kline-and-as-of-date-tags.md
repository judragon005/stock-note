# 06-multi-timeframe-kline-and-as-of-date-tags

## Description
在 01 主 K 線圖卡片中增設【日 K | 週 K | 月 K】多週期快速切換工具列，實裝前端毫秒級日 K 聚合演算法；並在法人、集保、營收等各卡片微觀腳註標明資料發布基準日（As-of Date），徹底消除時效疑慮。

## Target Files
- `src/components/aiForceDashboard/cards/KLineChartCard.tsx`
- `src/components/aiForceDashboard/cards/KLineChartCard.test.ts`
- `src/engine/klineAggregationEngine.ts`

## Acceptance Criteria
- [x] 實裝日 K 聚合為週 K、月 K 的高效率純函數 `aggregateCandlesToTimeframe`。
- [x] `KLineChartCard.tsx` 提供週期切換鈕，均線自適應重算，游標十字查價列同步支援。
- [x] 在各卡片邊角清晰呈現「發布基準日 (As-of Date)」，透明呈現盤後多頻率資料時序。
- [x] 單元測試驗證聚合算法邊界（跨年、跨月）與切換狀態。

## Status
- [x] completed
