# 10 — 風控指標看板升級（Sortino 比率與當前回撤深度）

**What to build:**
升級資產頁面的量化風控指標看板（Card Grid）。在指標清單中正式引入「索提諾比率 (Sortino Ratio)」卡片，並提供智能診斷 Tooltip；將原本只展示歷史極值的 MDD 卡片升級為雙重動態指標：同時展示「歷史最大 MDD」與「當前距新高水下深度 (Current Drawdown)」，讓投資人即時感知當前部位風險與停損防禦狀態。

**Blocked by:** Ticket 01, Ticket 04, Ticket 07

**Status:** DONE

- [x] 在 `quantMetrics.ts` 的 `calculateQuantMetrics` 中計算並輸出 `sortinoRatio` 與 `currentDrawdownPercent`
- [x] 在 `PortfolioGrowthChart.tsx`（或其子看板元件）加入 Sortino Ratio 指標卡片與顏色評級（>2 優秀，1~2 良好，<1 需警惕）
- [x] 升級 MDD 卡片佈局，呈現「歷史最大: -18.5%」與「當前水下: -3.2%」
- [x] 單元測試驗證指標看板傳入數據解析正確且無渲染崩潰
