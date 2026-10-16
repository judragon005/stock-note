# 03 — 後端台美交割結算日分流演算法 (getSettlementDate)

**Parent:** #275

**What to build:**
在 `trading-calendar-engine.cjs` 中實作交割結算日純演算法 `getSettlementDate(tradeDateStr, market)`。台股往後推導 2 個有效交易營業日 (T+2)，美股往後推導 1 個有效交易營業日 (T+1)，遇休市日或週末自動順延。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 台股週四買進遇到週五休市時，交割日正確跳轉至下週二。
- [ ] 美股週四買進遇到週五休市時，交割日正確跳轉至下週一。
- [ ] 遇颱風天災停市（如 2026-07-10）款券交割自動順延至下一營業日。
- [ ] 單元測試驗證台美雙市場常態與連假交割邊界用例。
