# 03 — 自適應限流防禦與 HTTP 429 階梯式熔斷退避狀態機 (Adaptive Rate Limiter & Backoff State Machine)

**What to build:**
1. 增強美股 API 呼叫的請求間隔控制器：
   - 實作動態隨機抖動間隔：每檔請求間強制休眠 `baseDelayMs (800ms) + random(0, 400ms)`。
   - 保證同一 IP 每秒請求數不超過 1.2 次，每分鐘請求數控制在 50~60 次安全區間內。
2. 實作階梯式退避與熔斷機制 (Exponential Backoff with Circuit Breaker)：
   - 捕獲 HTTP 429 或頻率警告時，觸發冷卻休眠（第 1 次 10 秒 ➔ 第 2 次 30 秒 ➔ 第 3 次 60 秒）。
   - 連續 3 次 429 觸發熔斷，安全儲存 Checkpoint 進度並正常退出，杜絕 IP 被永久封禁。

**Blocked by:** Ticket 01

**Status:** completed

- [x] 實作抖動延遲與受控併發機制 (Concurrency = 1 ~ 2)。
- [x] 實作 429 階梯式退避狀態機與連續失敗熔斷退出防禦。
- [x] 撰寫單元測試以 Fake Timers 模擬 429 觸發與冷卻週期。
