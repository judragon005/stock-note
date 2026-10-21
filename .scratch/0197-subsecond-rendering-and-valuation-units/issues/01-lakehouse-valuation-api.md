# 01 — 官方每日估值中介層連通與幽靈標籤根除

**What to build:**
連通後端 Vite API 中介層與 SQLite 數據庫中之 `tw_valuation_daily` 表，使 `/api/market/history/:symbol` 能在一次請求中同時回傳標的之官方真實估值 (`pe`, `pb`, `dividend_yield`)。前端 `marketCacheLoader.ts` 接收並存入 payload，使華星光 4979 及全市場個股直讀真實估值；當無估值數據時，`<valuation_tier>` 誠實標記為 `待同步`，徹底消滅幽靈標籤。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 在 `scripts/market-sync/vite-market-middleware.cjs` 查詢 `tw_valuation_daily` 並回傳 `valuation: { pe, pb, dividend_yield }`
- [ ] 在 `src/engine/marketCacheLoader.ts` 接收 `valuation` 數據
- [ ] 在 `src/engine/aiForcePromptAdapter.ts` 修正空值時輸出 `待同步`，根除幽靈標籤
- [ ] 單元測試驗證通過
