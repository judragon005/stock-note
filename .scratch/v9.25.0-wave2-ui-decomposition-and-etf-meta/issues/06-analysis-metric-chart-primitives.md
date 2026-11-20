# T06: AnalysisMetricView 共用 SVG 圖表原語抽離 (Debt 0050 Part 1)
- 關聯 Issue: #596 / Spec 0241 / Debt 0050
- 目標檔案: `src/components/analysis/sections/metricChartPrimitives.tsx`
- 驗收: 抽離 `renderSimpleBars`、`renderDualLines`、`renderValuationRiver` 為獨立純函式模組，SVG 輸出 100% 等價。
