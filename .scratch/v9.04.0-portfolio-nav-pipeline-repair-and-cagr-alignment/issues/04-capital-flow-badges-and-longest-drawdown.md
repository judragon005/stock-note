# 04 — Hover Crosshair 出入金事件標籤打點與歷史最長水下天數

**What to build:**
解決出入金跳空誤判與歷史極端回撤持續期盲區。在資產成長折線圖懸停（Hover）於特定日期時，若當日包含外部資金流（DEPOSIT 或 WITHDRAWAL），於 Tooltip / Crosshair 醒目標註「💵 入金: +金額」或「💸 出金: -金額」標籤，避免使用者將注入本金誤認為超額回報。同時於水下回撤圖卡片計算並顯示「歷史最長水下天數 (Longest Drawdown Duration)」，精確統計歷史最高點跌落後連續未創新高的最長日曆天數。

**Blocked by:** 01 — App 頂層管線貫通、除息平滑補齊與券商帳戶金流隔離

**Status:** DONE

- [x] 在 `src/components/PortfolioGrowthChart.tsx` 中解析當前快照或關聯現金流之出入金事件
- [x] 於 Hover Tooltip 渲染「💵 入金」與「💸 出金」膠囊標籤
- [x] 實作遍歷歷史快照中 `underwaterDrawdownPercent < 0` 最長連續天數之純算法
- [x] 於水下回撤圖指標列新增「歷史最長水下天數」指標卡片
- [x] 撰寫單元測試驗證出入金標籤正確性與最長水下天數算法
