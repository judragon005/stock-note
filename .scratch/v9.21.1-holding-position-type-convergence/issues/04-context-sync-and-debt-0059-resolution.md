# 04 — 領域通用語言禁用別名登錄、技術債 0059 結案與全庫雙重綠燈驗收

**What to build:** 於 `CONTEXT.md` 鎖定 `avgCostFxRate`、`plan`、`dispositionEvents` 為唯一正統術語並禁用 `avgExchangeRate` / `tradePlan`，將技術債 0059 標記為 `RESOLVED`，執行全庫編譯與測試雙重綠燈驗收。

**Blocked by:** 01, 02, 03

**Status:** done (Spec 0236 / Issue #586)

- [x] `CONTEXT.md` 更新 `HoldingPosition Canonical Fields` 術語規範
- [x] `docs/debts/0059-holding-position-extended-fields-type-convergence.md` 與 `docs/debts/README.md` 更新為 `RESOLVED`
- [x] `npm test` (297 檔 / 2,313 測試) 與 `npm run build` 0 錯誤通過
