# Ticket 07: 「見自己」A/B 雙軌決策引擎與 Markdown/CSV 報告導出

**State:** CLOSED  
**Parent:** #472 (Spec 0221)  

## What to build
1. 於 `src/engine/zavySlowWealthEngine.ts` 實作：
   - `generateTrackADecision`：個人風險預算反推股票部位上限（可承受回撤金額 ÷ 情境跌幅）、週期調節目標、質押償還優先建議與四階減碼瀑布流。
   - `generateTrackBDecision`：B 軌五大資產純度體檢、增量股息活水轉向試算、25/25/25/25 永久組合切換。
   - `generateZavyAnalysisReport`、`exportZavyReportMarkdown`、`exportZavyRawDataCsv`：輸出結構化分析報告與原始數據 CSV。

## Acceptance criteria
- [x] 單元測試驗證 A 軌風險預算反推與質押保護邏輯。
- [x] 單元測試驗證 Markdown 包含原典錨點與個人帳本對齊，CSV 欄位齊全。
