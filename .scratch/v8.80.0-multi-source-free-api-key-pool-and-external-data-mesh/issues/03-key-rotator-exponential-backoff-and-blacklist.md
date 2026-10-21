# 03-key-rotator-exponential-backoff-and-blacklist

## Description
在 `SmartKeyRotator` 中實作智慧容錯反饋中樞 `reportStatus` 與動態調度執行器 `executeWithRotation`。負責處理 HTTP 429 限流懲罰（指數退避冷卻）、401/403 永久失效拉黑，以及遭遇暫時性失敗時切換下一組備援 Key 自動重試。

## Target Files
- `src/engine/smartKeyRotator.ts`
- `src/engine/smartKeyRotator.test.ts`

## Acceptance Criteria
- [x] 實作 `reportStatus(keyItem, statusCode, retryAfterSeconds)` 狀態回報函式。
- [x] 遭遇 HTTP 429 時，依據失敗次數計算指數退避時間：$penalty = base \times 2^{failures}$（預設 base = 60s，上限 1 小時），更新 `cooldownUntil`。
- [x] 遭遇 HTTP 401 或 403 時，直接標記 `isBlacklisted = true`，自後續輪替池永久除名。
- [x] 實作 `executeWithRotation<T>` 執行器：單一 Key 失敗時立即回報並無縫換下一個可用 Key 重試，直到成功或所有 Key 均耗盡。
- [x] 編寫測試驗證 429 自動退避時間遞增、401 即刻拉黑、以及多 Key 容錯連續切換情境。

## Status
- [x] done
