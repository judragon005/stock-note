# 技術債 #0035: 客戶端 API 速率限制 (Rate Limiting) 與防封禁配額保護

- **狀態**：`RESOLVED` (已於 v8.9.0 / ADR #0090 完整解決)
- **優先級**：`P2`
- **發現來源**：資安架構深度審查
- **建立日期**：2026-09-02
- **解決日期**：2026-09-07 (PRD #0090 / ADR #0090)
- **標籤**：`Security` · `RateLimiting` · `Quota` · `Resilience` · `CircuitBreaker`

---

## 1. 背景與現狀代碼 (Context & Current Code)

專案中包含多個批量網路非同步請求場景：
1. `corporateActionScanner.ts`：啟動時掃描數十檔持股的歷史與最新除息公告。
2. `priceFetcher.ts`：更新整體投資組合各標的最新收盤/盤中行情。
3. 未來的歷史 K 線與技術指標回補 (Debt #0019) 及宏觀戰情室數據拉取 (Debt #0020)。

目前呼叫方式採用 `Promise.all` 或密集迴圈直接發出 `fetch` 請求。

---

## 2. 問題分析與潛在風險 (Problem & Risk Analysis)

1. **IP 遭交易所封鎖與 HTTP 429 風暴**：
   - 短時間內向 TWSE、TPEx 或 Yahoo Finance 併發發送 50~100 個 HTTP 請求，極易觸發伺服器端 DDoS 防禦與 Rate Limit，導致本機 IP 被暫時封鎖數小時，所有行情更新功能癱瘓。
2. **付費 API 額度瞬間耗盡 (Denial of Wallet)**：
   - 商業 API（如 FMP 免費版每日限 250 次、AlphaVantage 每分鐘限 5 次）若在無節流保護下連續觸發重試，數秒內即可將使用者整月或整日的配額完全消耗殆盡。
3. **瀏覽器端連線阻塞與主執行緒卡頓**：
   - 併發大量 HTTP 請求佔滿瀏覽器 6 個同源 TCP 連線通道，導致其他資源載入與 UI 渲染嚴重延遲。

---

## 3. 建議防護架構 (Proposed Rate Limiter & Circuit Breaker)

建立**客戶端全域請求排程調度器 (Client-side Request Scheduler & Token Bucket)**：

```mermaid
flowchart LR
    Batch[批次請求 50 筆標的] --> Queue[優先級請求佇列 Queue]
    Queue --> TokenBucket[權杖桶速率限制器 Token Bucket]
    TokenBucket --> Concurrency[最大並發控制 Concurrency: 3]
    Concurrency --> Network[發送請求 Fetch]
    Network -->|遇到 429/503| Breaker[熔斷器 Circuit Breaker 暫停 30s + 指數退避]
```

### 核心設計機制：
1. **網域獨立的速率與並發限制 (Domain-specific Concurrency Limits)**：
   - `TWSE / TPEx`：最大並發 2 個連線，每秒不超過 3 次請求。
   - `Yahoo Finance`：最大並發 3 個連線，每秒不超過 5 次請求。
   - `AlphaVantage`：每分鐘嚴格限制不超過 5 次請求 (間隔 12 秒)。
2. **指數退避與熔斷機制 (Exponential Backoff & Circuit Breaker)**：
   - 若特定 API 回傳 HTTP 429 (Too Many Requests) 或 503，自動觸發熔斷器，將該域名暫停 30~60 秒，並在 UI 上顯示「該數據源正在冷卻降頻中」，避免無效轟炸。
3. **每日配額追蹤與警告儀表板**：
   - 針對有限次數的 API 金鑰記錄本機當日呼叫次數，當消耗達 80% 時給予提醒，避免意外超額。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] 一次觸發 50 檔股票行情同步時，請求依序受控發送，並發數不超過 3，無任何 429 錯誤發生。
- [ ] 模擬伺服器返回 429 時，排程器立即進入冷卻期並執行退避重試，不再連續發起新請求。
- [ ] 單元測試驗證 Token Bucket 節流邏輯、並發池排隊控制與熔斷冷卻機制。

---

## 5. 觸發處理時機 (Trigger Conditions)

- 實作全量歷史指標回補 (Debt #0019) 或宏觀數據爬取 (Debt #0020) 前。
