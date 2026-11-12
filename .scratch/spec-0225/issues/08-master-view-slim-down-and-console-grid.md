# 08 — `DividendLogView.tsx` 極簡協調器收斂與 2×2 金融控制台排版

**What to build:**
將 `DividendLogView.tsx` 瘦身至 250 行以內，作為純調度容器整合上述 4 個子組件，採用 2×2 金融控制台網格佈局取代長瀑布單向滾動，數字全局應用 `tabular-nums`，保持對外 Props 100% 向後相容。

**Blocked by:** 04 — `DividendMonthlyChart.tsx` 月度配息長條圖與開銷基準線, 05 — `DividendKpiSummary.tsx` 四大發光 KPI、質押利差與配股追蹤卡片, 06 — `DividendCalendarCard.tsx` 12個月預估月曆、生活費對標與 Zavy 活水轉向, 07 — `DividendHistoryTable.tsx` 明細表、YOC 成本殖利率與「一鍵已入帳」按鈕

**Status:** ready-for-agent

- [ ] `DividendLogView.tsx` 瘦身至 250 行內，外部呼叫介面零破壞。
- [ ] 導入 2×2 網格佈局與金融等寬數字字型。
- [ ] 妥善串聯各子組件的狀態回調（切換年度、切換市場、展開抽屜、一鍵入帳）。

