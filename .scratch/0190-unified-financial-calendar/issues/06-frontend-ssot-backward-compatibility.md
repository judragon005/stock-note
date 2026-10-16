# 06 — 前端 holidayCalendar.ts 接入 SSOT 字典並保持 100% 向後相容

**Parent:** #275

**What to build:**
重構 `src/engine/holidayCalendar.ts`，廢除手寫的 `TW_MARKET_HOLIDAYS` 與 `US_MARKET_HOLIDAYS` Set，改為直接引用 `src/data/market-holidays.json`。同時導出新 API（`getHolidayReason`, `getSettlementDate` 等），並 100% 維持對舊 API 的向後相容。

**Blocked by:** 01 — 建立雙市場法定與天災休市日曆 SSOT 字典 (market-holidays.json)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `holidayCalendar.ts` 改引 `market-holidays.json`，零代碼重複。
- [ ] 既有公開介面 `isBusinessDay`, `isMarketHoliday`, `getNextBusinessDay` 簽名與行為不變。
- [ ] 現有消費者 `cashLedgerEngine.ts`, `dcaSchedulerEngine.ts`, `adaptiveUniverseEngine.ts` 零破壞。
- [ ] `src/engine/holidayCalendar.test.ts` 與所有關聯測試 100% 通過。
