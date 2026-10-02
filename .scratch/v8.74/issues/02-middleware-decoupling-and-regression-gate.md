# 02 — 中介層委託服務解耦與向後相容驗證

**What to build:** 重構 `scripts/market-sync/vite-market-middleware.cjs` 移除內嵌的資料庫查詢與時區運算，全面委託市場新鮮度服務；確保既有 `/api/market/sync-status` 端點契約 100% 相容，既有 `viteMarketMiddleware.test.ts` 保持全綠燈。

**Blocked by:** 01 — 獨立抽取市場新鮮度服務與單元測試

**Status:** done

- [x] 重構 `vite-market-middleware.cjs` 導入並調用 `market-freshness-service.cjs`
- [x] 移除中介層冗餘私有計算函數
- [x] 確保 `viteMarketMiddleware.test.ts` 測試全數綠燈 (4/4 通過)
- [x] 確保 `marketFreshnessService.test.ts` 測試全數綠燈 (4/4 通過)
