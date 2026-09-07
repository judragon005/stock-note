# Ticket #03: 資產成長折線圖 (NAV) 與 股利日誌 (Dividend Log) UI/UX 升級

## 🎯 目標 (Objective)
升級資產成長 NAV 全歷史曲線圖與股利被動現金流頁面，強化時間範圍交互、圖表 Tooltip HUD 與應收股利發放視覺提示。

## 📋 任務清單 (Tasks)
- [x] 重構 `src/components/PortfolioGrowthChart.tsx`：
  - 時間範圍切換器（1M / 3M / 6M / YTD / 1Y / ALL）膠囊化。
  - 基準對照選單 (0050 / SPY / 50-50) 膠囊化。
  - 指標卡大字 Tabular Numbers 排版、折線開關精緻化。
  - 機構級量化風控看板與 Tooltip 原理診斷卡片層次優化。
- [x] 重構 `src/components/DividendLogView.tsx`：
  - Hero Header Banner 深色玻璃漸變與年份切換器 Pill 化。
  - 4 大 KPI 摘要卡片（實領、TTM、待發放、全歷史）發光卡片。
  - 月度股利立體長條圖與標的貢獻榜 Top 5 進度條。
  - 除息待入帳行事曆與即將除息預告雙看板。
  - 歷史現金股利入帳流水明細表現代化。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] NAV 折線計算、基準比較、應收股利與除權息日誌完全正確。
- [x] TypeScript 0 錯誤，Vitest 465 項單元測試 100% 通過。
