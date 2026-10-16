# 08 — 上市櫃公司月營收 10 號遇假自動順延演算法與服務整合

**Parent:** #275

**What to build:**
在 `trading-calendar-engine.cjs` 中實作營收法規截止日演算法 `getRevenueDeadlineDate(year, month)`。取次月 10 日，若逢週末或國定休市日，自動順延至次一有效交易營業日 17:30。同步更新 `ingest-tw-monthly-revenue.cjs`。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 2026 年 4 月營收截止日為 2026-05-10（週日），系統自動順延至 2026-05-11（週一）。
- [ ] `ingest-tw-monthly-revenue.cjs` 與 `market-freshness-service.cjs` 在 10 號遇假日期間不再提早誤判公司資料缺漏。
- [ ] 附單元測試驗證順延日期。
