# 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Parent:** #275

**What to build:**
重構 `scripts/market-sync/trading-calendar-engine.cjs`，拔除硬編碼的休市 Set，改為直接讀取 `src/data/market-holidays.json`。升級 `isTradingDay` 並導出 `getHolidayReason`。

**Blocked by:** 01 — 建立雙市場法定與天災休市日曆 SSOT 字典 (market-holidays.json)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `trading-calendar-engine.cjs` 成功載入 JSON 字典，不再維護重複的 Set。
- [ ] `isTradingDay(dateStr, market)` 正確過濾週末與國定/天災假日，台美兩市皆支援。
- [ ] `getHolidayReason(dateStr, market)` 能在 `2026-09-28` 回傳 `"教師節"`、`2026-07-10` 回傳 `"巴威颱風停市"`、`2025-12-25` 回傳 `"行憲紀念日"`、`2025-10-24` 回傳 `"光復節補假"`；若是正常營業日則回傳 `null`。
- [ ] `trading-calendar-engine.test.cjs` 測試 100% 通過。
