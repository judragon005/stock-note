# 03 — 後端快照端點 T-5 基準前收價補齊與 5D 累計漲跌幅精算

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #436 (CLOSED)

**What to build:**
1. `scripts/market-sync/vite-market-middleware.cjs` 之 `/api/market/chips-snapshot` 往前多抓取 1 個交易日收盤價作為基準日收盤價。
2. 5D 累計漲跌幅精確涵蓋完整 5 個交易日，消除首日為 0 與少算 1 天問題。

**Acceptance Criteria:**
- [x] 快照 response 包含 `baseDate`。
- [x] 首日 `changePercent` 依前收價計算，不為 0。
- [x] 單元測試 100% 通過。
