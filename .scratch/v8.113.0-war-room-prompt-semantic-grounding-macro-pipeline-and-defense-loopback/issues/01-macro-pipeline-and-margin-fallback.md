# Ticket 01: 宏觀數據中介層附掛與資券餘額非 null 回溯演算法

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0200](../../../docs/specs/0200-war-room-prompt-semantic-grounding-macro-pipeline-and-defense-loopback-spec.md)
- **關聯 Issue**：#312

## 任務目標
1. 在 `scripts/market-sync/vite-market-middleware.cjs` 的 `/api/market/history/:symbol` 路由中，查詢 `macro_sentiment_daily` 最新 1 筆記錄並附掛於 `macro` 欄位回傳。
2. 在 `src/engine/marketCacheLoader.ts` 中解析 `macro` 數據；並實作資券回溯防呆：當最新一日籌碼之 `marginBalance` 為 `null` 時，自動向後回溯尋找最近一日非 `null` 之有效資券記錄，並標註 `marginAsOfDate`。
3. 撰寫 `marketCacheLoader.test.ts` 單元測試，確保資券回溯與宏觀映射 100% 通過。
