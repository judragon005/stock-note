# 04 — 主力戰情室端到端處置徽章注入與真實連動 E2E

**What to build:** 
在 `src/components/aiForceDashboard/AiForceDashboardView.tsx:113`，取得 Ticket 03 之 `statusTag` 並傳入 `generateAiForceReportFromCandles` 的第 8 參數 `options: { statusTag }`。使 `HeaderMarketBar.tsx` 的處置警示徽章（`data-testid="market-disposition-badge"`）與注意徽章（`data-testid="market-attention-badge"`）真實連動。撰寫 E2E 測試驗證處置股票真實亮燈。

**Blocked by:** 03 — 本地湖倉處置/注意事件快取讀取器

**Status:** ready-for-agent

- [ ] `AiForceDashboardView.tsx` 呼叫點傳入解析後的 `statusTag`
- [ ] 處置股票（`DISPOSITION`）時，頂部 MarketBar 渲染紅色處置警示徽章
- [ ] 注意股票（`ATTENTION`）時，頂部 MarketBar 渲染黃色注意警示徽章
- [ ] 正常狀態（`NORMAL`）或美股時，不顯示任何警示徽章
- [ ] 編寫 `AiForceStatusTagE2E.test.ts` 驗收測試 100% 通過
