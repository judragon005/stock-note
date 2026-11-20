# T04: 中介層與前端湖倉實時 AUM/費率端到端貫通 (優先覆寫 ETF_BASELINE_META)
- 關聯 Issue: #596 / Spec 0241 / Debt 0061 #3
- 目標檔案: `scripts/market-sync/vite-market-middleware.cjs`, `scripts/market-sync/on-demand-backfill-orchestrator.cjs`, `src/engine/marketCacheLoader.ts`, `src/engine/aiForceMarketAssembly.ts`
- 驗收: `/api/market/history/:symbol` 回傳 `etfNav.aumBillion`/`unitChange` 與 `etfMeta`；前端嚴格優先實時湖倉數據，TDD 測試全綠。
