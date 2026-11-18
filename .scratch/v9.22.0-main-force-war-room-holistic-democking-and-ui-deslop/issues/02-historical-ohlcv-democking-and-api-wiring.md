# Issue 02: 前端日 K 回補去假與報價載入器湖倉 API 擴充接線

- **層級**: 前端載入器 / 歷史資料回補
- **關聯規格**: Spec 0237 Ticket 2 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 拔除 `src/engine/historicalOhlcvBackfill.ts` 中的 `generateSyntheticCandles` 假 K 線回退邏輯，查無資料時誠實回傳 `[]` 並觸發 `isDataPending` 空狀態。
2. 擴充 `/api/market/history/:symbol` 與 `src/components/aiforce/aiForceDataLoader.ts`，接收並回傳 `sblBalance` (借券賣出)、`marginBalanceChange` (融資日增減)、`pledge` (董監質押)、`etfNav` (ETF 每日淨值與折溢價) 與 `corporateActions` (除權息日曆)。
