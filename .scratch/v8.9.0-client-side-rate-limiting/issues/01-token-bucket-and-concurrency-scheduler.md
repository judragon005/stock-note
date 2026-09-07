# Issue #0090-01: 權杖桶速率限制與並發排程器核心實作 (Token Bucket & Concurrency Scheduler)

- **標籤**：`ready-for-agent` · `Architecture` · `Network` · `RateLimiting`
- **對應規格**：[PRD #0090](../../../docs/specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md)
- **優先級**：`P1`

---

## 任務描述
實作 `src/engine/rateLimiter.ts` 核心模組，包含：
1. **`TokenBucket` 演算法**：支援按網域動態填充權杖，防止突發流量。
2. **`ConcurrencyPool` 並發槽位控制**：限制單一網域或全域同時間在線的連線數上限（預設 3）。
3. **`ClientRequestScheduler` 全域調度器**：支援根據目標 URL 自動萃取 domain 並進入排程佇列。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫 `src/engine/rateLimiter.test.ts`，測試權杖桶在短時間內多個請求時依序平滑發放。
- [ ] 測試並發請求超過 `maxConcurrency` 時正確排隊等待，槽位釋放後立即喚醒下一個請求。
