# 11 — 台股歷史回補 (backfill-tw-history-web.cjs) 候選日精準排除與異常隊列防污染

**Parent:** #275

**What to build:**
更新 `scripts/market-sync/backfill-tw-history-web.cjs` 的候選日產生邏輯，使其在往前回溯 250 天時，事前精準過濾 `2026-09-28`、`2026-07-10`、`2025-12-25`、`2025-10-24`。回補日誌不再輸出 `⚠️ [官方無資料（異常）]`，且休市日絕不推入 `failedDates`。

**Blocked by:** 02 — 後端日曆引擎 (trading-calendar-engine.cjs) 接入 SSOT 與中文休市原因

**Status:** done

## Acceptance Criteria
- [x] 執行 250 天歷史回補候選日產生時，該 4 個日期 100% 排除在候選名單之外。
- [x] 終端機不再印出 `⚠️ [官方無資料（異常）] 略過`。
- [x] `failedDates` 陣列在正常合法休市日不會被污染，徹底杜絕智慧補漏重試死循環。
- [x] `src/engine/backfillTwHistoryWeb.test.ts` 相關測試 100% 通過。
