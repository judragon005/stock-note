# 02-smart-key-rotator-round-robin-and-quota

## Description
實作 `SmartKeyRotator` 金鑰輪替管理器的基本生命週期與加權 Round-Robin 派發邏輯。負責註冊金鑰、過濾可用金鑰、單日調用量累計、單日配額耗盡（Quota Exhausted）自動跳過，以及跨日自動重置計數器。

## Target Files
- `src/engine/smartKeyRotator.ts`
- `src/engine/smartKeyRotator.test.ts`

## Acceptance Criteria
- [x] 實作 `SmartKeyRotator.registerKey(provider, key, options)` 方法，支援初始配置。
- [x] 實作 `SmartKeyRotator.acquireKey(provider)` 方法，僅挑選符合條件（未失效、未在冷卻期、今日未超過配額）的金鑰進行 Round-Robin 派發。
- [x] 當金鑰調用累計達到 `dailyQuotaLimit` 時，狀態自動標記為配額耗盡並暫停指派。
- [x] 實作每日午夜（00:00 UTC+8）或跨日檢測時自動重置 `totalRequestsToday = 0`。
- [x] 編寫單元測試驗證多 Key 均勻輪替、配額滿載跳過與跨日重置行為。

## Status
- [x] done
