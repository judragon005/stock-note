# Ticket 02 — AnalysisMetricView 估值河流圖歷史收盤價改以二元搜尋並搭配 useMemo

**State:** OPEN
**Parent:** #466 (Spec 0220)

## What to build
重構 `src/components/analysis/AnalysisMetricView.tsx` 中 P/E 河流圖與 P/B 河流圖之歷史收盤價匹配邏輯，移除 `[...historicalCandles].reverse().find(...)`，改為使用 `findLatestCloseBeforeDate` 配合 `useMemo`。

## Acceptance criteria
- [ ] 消除渲染時重複的陣列複製與反轉操作。
- [ ] 歷史收盤價軌跡紅線顯示結果與重構前 100% 一致。
- [ ] 現有 `AnalysisMetricView.test.tsx` 100% 通過。
