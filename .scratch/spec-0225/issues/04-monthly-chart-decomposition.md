# 04 — `DividendMonthlyChart.tsx` 月度配息長條圖與開銷基準線

**What to build:**
將月度長條圖從龐大的 `DividendLogView.tsx` 中解耦為獨立子組件 `DividendMonthlyChart.tsx`，完整保留 Tooltip 智慧避讓演算法，並疊加每月生活開銷對標水平線（預設 35,000 元）。

**Blocked by:** 01 — ETF 分流推估 (+23天/+28天) 與「一鍵已入帳」資料流, 02 — YOC (成本殖利率) 與實質填息/貼息標籤計算模組

**Status:** ready-for-agent

- [ ] 獨立抽出 `src/components/dividend/DividendMonthlyChart.tsx`。
- [ ] 支援 `targetMonthlyExpenseTwd` 生活開銷基準水平虛線與達成月份視覺高亮。
- [ ] 保留既有動態邊界檢測與避讓 Tooltip 邏輯，單元測試綠燈通過。

