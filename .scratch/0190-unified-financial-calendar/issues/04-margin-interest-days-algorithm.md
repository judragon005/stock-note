# 04 — 跨長假融資計息日曆天計算演算法 (getHoldingInterestDays)

**Parent:** #275

**What to build:**
在 `trading-calendar-engine.cjs` 中實作兩營業日之間跨越之實際日曆天數計算 `getHoldingInterestDays(startDateStr, endDateStr)`，供融資融券計算真實計息天數使用。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 能精準計算跨越農曆春節長假（例如封關至開紅盤）之真實日曆天數（如 10 天）。
- [ ] 週五至週一之常態週末精準計算為 3 個日曆天。
- [ ] 零依賴純原生日期差額計算，附單元測試。
