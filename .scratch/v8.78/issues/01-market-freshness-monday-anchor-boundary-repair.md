# 01-market-freshness-monday-anchor-boundary-repair

## Description
修復 `scripts/market-sync/market-freshness-service.cjs` 中 `getMarketAnchorDate` 在週一盤前與盤中的定錨計算缺陷。針對未達結算時間（台股 15:00 / 美股 17:00）的場景，若當前基準日為週一（`day === 1`），應回退 3 天至上週五（`target.setDate(target.getDate() - 3)`），而非回退 1 天至週日非交易日。

## Acceptance Criteria
- [x] 當台股時間為週一 10:00 台北時間時，`getMarketAnchorDate('TW', mondayDate)` 應正確回傳上週五之日期字串。
- [x] 當台股時間為週一 15:30 台北時間時，`getMarketAnchorDate('TW', mondayAfterClose)` 應正確回傳週一當日之日期字串。
- [x] 當美股時間為週一 12:00 紐約時間時，`getMarketAnchorDate('US', usMondayDate)` 應正確回傳上週五之日期字串。
- [x] 當美股時間為週一 18:00 紐約時間時，`getMarketAnchorDate('US', usMondayAfterClose)` 應正確回傳週一當日之日期字串。
- [x] 更新 `src/engine/marketFreshnessService.test.ts`，100% 通過單元測試且無回歸。

## Status
- [x] done
