# 交接記錄手冊 (Handoff Manual) - v8.9.0

## 1. 本次迭代目標
依據使用者指令 `/to-spec ➔ /to-tickets ➔ /triage ➔ /tdd & /implement ➔ /code-review ➔ /handoff`，完成技術債精選中關鍵底層基石：
- **技術債 #0035 (P2)**：客戶端 API 速率限制 (Rate Limiting) 與防封禁配額保護。
- 為後續 **#0019 (全量指標回補庫)** 與 **#0020 (宏觀戰情室)** 打造零 429 封禁風險的堅實網路防線。

---

## 2. 產出成果與變更清單
- **PRD 規格書**：[docs/specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md](../../docs/specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md)
- **ADR 架構決策**：[docs/adr/0090-client-side-rate-limiting-and-api-quota-guard.md](../../docs/adr/0090-client-side-rate-limiting-and-api-quota-guard.md)
- **本地票券鏡像**：
  - `01-token-bucket-and-concurrency-scheduler.md` (CLOSED)
  - `02-circuit-breaker-and-429-backoff.md` (CLOSED)
  - `03-integrate-fetch-with-cors-proxy.md` (CLOSED)
- **核心代碼與測試**：
  - [src/engine/rateLimiter.ts](../../src/engine/rateLimiter.ts)：實作 `TokenBucket`、`ConcurrencyPool`、`CircuitBreaker` 與 `ClientRequestScheduler`。
  - [src/engine/rateLimiter.test.ts](../../src/engine/rateLimiter.test.ts)：9 個單元測試 100% 覆蓋。
  - [src/engine/priceFetcher.ts](../../src/engine/priceFetcher.ts)：將 `fetchWithCORSProxy` 接入全域排程調度器保護。
- **技術債狀態更新**：
  - [docs/debts/0035-client-side-rate-limiting-and-api-quota-guard.md](../../docs/debts/0035-client-side-rate-limiting-and-api-quota-guard.md) 標記為 `RESOLVED`。
  - [docs/debts/README.md](../../docs/debts/README.md) 看板同步標記為 `RESOLVED`。
- **領域模型同步**：
  - [CONTEXT.md](../../CONTEXT.md) 擴充速率限制、並發池與 429 熔斷機制之標準術語。

---

## 3. 測試與驗收指標
- **單元測試**：全專案 50 個測試套件、569 個測試 100% 通過（包含 9 個速率限制與熔斷測試）。
- **構建檢查**：`tsc && vite build` 0 錯誤通過。
- **回歸風險**：0 回歸。既有即時報價、歷史走勢、公司行動掃描、籌碼工作區全部正常運行。
