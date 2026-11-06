# 02 — 全專案新鮮度巡檢升級與連帶工作區（戰情室/動能雷達）斷鏈修復

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #435 (CLOSED)

**What to build:**
1. `scripts/market-sync/market-freshness-service.cjs` 納入三大法人筆數檢驗 (<1800 標記 isStale)。
2. `src/engine/marketCacheLoader.ts` 補齊 `trust_net` 欄位映射至 `trustNetBuy`。
3. `scripts/market-sync/sqlite-db-core.cjs` 現貨買賣超僅在雙邊完整日計算。

**Acceptance Criteria:**
- [x] 籌碼殘缺時新鮮度誠實告警。
- [x] 戰情室與動能雷達數值恢復正確。
- [x] 單元測試 100% 通過。
