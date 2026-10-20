# 03 — 戰情室前端連通既有單季財報 EPS 與毛利率數據孤島

**What to build:**
打通前端既有數據管線，在主力戰情室載入標的資料時，直接調用本機 `financialReportService.ts` 載入單季財報，將最新季 EPS、毛利率與營益率注入 `report.valuationMetrics`，使戰情室與提示詞具備第一手官方財報實績。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 的 `loadDataForSymbol` 流程中非阻塞調用 `loadOrFetchFinancialReport(targetSymbol, targetMarket)`。
- [ ] 提取最新單季之 `eps`、`grossMargin`、`operatingMargin` 欄位值。
- [ ] 注入 `report.valuationMetrics` 與傳遞至 `generateAiForceReportFromCandles` 的 `options.valuationData`。
- [ ] 確保在無網路或離線情況下能優雅降級讀取 IndexedDB 快取。
