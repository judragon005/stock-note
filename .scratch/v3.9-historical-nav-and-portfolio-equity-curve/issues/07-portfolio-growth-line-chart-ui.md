# 07 — 資產成長折線圖 UI 元件與互動 Tooltip (Portfolio Growth Line Chart UI & Tooltip)

**What to build:** 建立美觀、高對比且響應式的資產成長折線圖元件。支援多線自由勾選顯示（總 NAV、投入本金、持股市值、現金、借貸），並配備流暢的十字準心 Hover Tooltip，即時顯示當日各分項數值、漲跌幅與交易事件徽章（買進、賣出、除息等）。

**Blocked by:** 06 — 週期篩選器與關鍵績效指標統計

**Status:** ready-for-agent

- [ ] 建立 `PortfolioGrowthChart.tsx` 視覺化元件
- [ ] 實作多條曲線自由顯示/隱藏切換控制項（總 NAV、投入本金、持股市值、現金水位、借貸負債）
- [ ] 實作區間篩選按鈕群 (`1M` / `3M` / `6M` / `1Y` / `YTD` / `ALL`)
- [ ] 實作互動式十字準心 Tooltip，懸停顯示當日資產細項與交易標籤
- [ ] 頂部呈現 MDD、ATH、區間報酬等關鍵指標摘要卡片
