# 04A — Card 21 資料模型定義與台股個股動態估值 (PE/PB/年化殖利率與歷史位階條)

**Parent:** #290

**What to build:**
於 `src/types/aiForceDashboard.ts` 建立 `ValuationMetricsData` 資料模型與資料獲取邏輯。實作 `ValuationMetricsCard.tsx` 台股基礎邏輯：盤中動態 PE（即時價連動 EPS）、PB、年化現金殖利率與歷史三段位階條（低估 / 合理 / 偏高）。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 定義 `ValuationMetricsData` 介面，並於戰情室主資料模型擴充 `valuationMetrics`。
- [x] 實作 `ValuationMetricsCard.tsx` 台股一般個股渲染：盤中 PE、PB、年化殖利率。
- [x] 繪製三段式歷史估值位階條（低估、合理、偏高）。
- [x] 單元測試通過。
