# 01-api-key-pool-types-and-state-schema

## Description
在 `src/engine/` 中建立外部 API 金鑰池與狀態追蹤的核心型別定義檔案 `apiKeyPoolTypes.ts`。為所有支援多金鑰的供應商（FinMind, Finnhub, FRED, Polygon, CoinGecko 等）建立嚴格的 TypeScript 介面，涵蓋金鑰中繼資料、配額統計、健康狀態及執行選項。

## Target Files
- `src/engine/apiKeyPoolTypes.ts`

## Acceptance Criteria
- [x] 定義 `ProviderType = 'finmind' | 'finnhub' | 'fred' | 'polygon' | 'coingecko' | 'sec'` 聯集型別。
- [x] 定義 `KeyHealthStatus = 'HEALTHY' | 'COOLING_DOWN' | 'QUOTA_EXHAUSTED' | 'INVALID'`。
- [x] 定義 `ApiKeyItem` 介面，包含 `id`, `provider`, `key`, `alias`, `weight`, `dailyQuotaLimit`, `totalRequestsToday`, `rateLimitPerMin`, `consecutiveFailures`, `isBlacklisted`, `cooldownUntil`, `lastUsedTimestamp`。
- [x] 定義 `KeyPoolExecutionOptions` 與 `KeyPoolStatistics` 介面。
- [x] 撰寫型別防禦測試 `src/engine/apiKeyPoolTypes.test.ts`，確保型別約束與預設狀態建構函數正確。

## Status
- [x] done
