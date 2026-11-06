# Ticket 05 — 全量測試與建置回歸驗證，並更新 docs/debts/ 看板

**State:** OPEN
**Parent:** #466 (Spec 0220)

## What to build
執行全專案 `npm test` 與 `npm run build` 回歸驗收，確認 0 錯誤後將 `docs/debts/README.md` 看板中的技術債 0055 與 0056 狀態更新為 `RESOLVED`。

## Acceptance criteria
- [ ] `npm test` 275+ 測試檔 100% 通過。
- [ ] `npm run build` TypeScript 0 錯誤。
- [ ] `docs/debts/README.md` 看板狀態與預計觸發時機同步更新為已於 v9.15.0 解決。
- [ ] 更新 `0055-warroom-divergent-change-metrics-hook.md` 與 `0056-valuation-river-candle-lookup-binary-search.md` 的狀態為 `RESOLVED`。
