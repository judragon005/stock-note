# Ticket 01: 成長率基期擴充與缺失基期平整化

## 任務內容
- [x] 將 taiwanFinancialPipeline.ts 之 start_date 擴展至 2021-01-01
- [x] 在 AnalysisMetricView.tsx 增加基期嚴格判定 (hasBaseline)
- [x] 無基期時輸出 displayValue: '-' 且柱高歸零，杜絕虛假 0% 綠柱
