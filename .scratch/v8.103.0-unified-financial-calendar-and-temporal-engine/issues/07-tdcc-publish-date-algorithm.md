# 07 — 集保股權分散表 (TDCC) 逢連假自動前推演算法與服務整合

**Parent:** #275

**What to build:**
在 `trading-calendar-engine.cjs` 中實作集保基準發布日推導 `getLatestTdccPublishDate(now)`。基準為每週五，若週五適逢國定休市或颱風假，自動往前遞歸推至該週最後一個交易營業日（週四）。同步更新 `market-freshness-service.cjs` 與 `ingest-tw-tdcc.cjs`。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 當前為 2026-04-03 清明連假週五時，集保基準日自動前推至 2026-04-02 週四。
- [ ] `market-freshness-service.cjs` 的 `getLatestSettledTdccFriday` 升級重用此函數，不再寫死週五。
- [ ] `ingest-tw-tdcc.cjs` 於連假週五執行時能正確下載週四的大戶籌碼日報。
