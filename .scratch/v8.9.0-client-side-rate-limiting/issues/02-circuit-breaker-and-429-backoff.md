# Issue #0090-02: HTTP 429 熔斷器與指數退避冷卻機制 (Circuit Breaker & 429 Backoff)

- **標籤**：`ready-for-agent` · `Security` · `Resilience` · `CircuitBreaker`
- **對應規格**：[PRD #0090](../../../docs/specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md)
- **優先級**：`P1`

---

## 任務描述
在 `src/engine/rateLimiter.ts` 中加入熔斷防護：
1. **429 / 503 偵測與熔斷狀態切換**：當外部響應包含 HTTP 429 或 503 時，自動將該網域的熔斷器切換為 `isOpen = true`。
2. **冷卻期機制**：預設冷卻 30 秒，冷卻期內凡向該網域發起之請求直接快速失敗或自動排隊延後，避免連環衝擊造成 IP 封鎖延長。
3. **熔斷器手動與自動恢復 (Half-Open / Reset)**：冷卻期結束後允許試探請求，成功則恢復正常。

## 驗收條件 (Acceptance Criteria)
- [ ] 撰寫單元測試覆蓋 429 觸發熔斷、冷卻期攔截阻斷、冷卻過期後自動復原等完整狀態機流轉。
