# 02-vite-middleware-catchup-cooldown-guard

## Description
在 `scripts/market-sync/vite-market-middleware.cjs` 的 `triggerCatchupTask` 引入基於時間戳的冷卻防禦機制（Cooldown Guard）。預設設定 10 分鐘（600,000 ms）冷卻期。當兩次回補觸發間隔未滿冷卻期時，拒絕再次啟動背景回補任務，終結頻繁 API 請求造成的無窮回補死循環。

## Acceptance Criteria
- [x] 定義冷卻常數 `CATCHUP_COOLDOWN_MS = 10 * 60 * 1000`。
- [x] 在 `triggerCatchupTask` 檢查 `Date.now() - lastCatchupTime < CATCHUP_COOLDOWN_MS`，若在冷卻期內則略過執行，並印出防護日誌。
- [x] 中介層端點 `/api/market/sync-status` 在冷卻期內仍可正常回傳當前新鮮度狀態與 `lastCatchupTime`。
- [x] 在 `src/engine/viteMarketMiddleware.test.ts` 新增測試驗證冷卻防禦行為。

## Status
- [x] done
