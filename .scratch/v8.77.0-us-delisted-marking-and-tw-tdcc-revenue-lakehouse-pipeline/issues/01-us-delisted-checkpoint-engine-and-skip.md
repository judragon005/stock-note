# 01-us-delisted-checkpoint-engine-and-skip

## Description
在 `us-sync-checkpoint-engine.cjs` 與 `sync-us-market.cjs` 中實作美股已下市/併購標的智慧識別。遇到 HTTP 404 時記錄 `status = 'DELISTED'`，且 `getPendingUsSymbols` 排除 `DELISTED` 標的，避免無效輪詢。在 `audit-verifier.cjs` 中獨立呈現下市標的數。

## Acceptance Criteria
- [ ] `sync_checkpoints` 支援 `DELISTED` 狀態儲存。
- [ ] `getPendingUsSymbols` 篩選條件排除 `DELISTED` 標的。
- [ ] 既有 348 檔標的更新為 `DELISTED` 狀態。
- [ ] 提供單元測試覆蓋狀態機轉換與跳過邏輯。

## Status
- [x] done
