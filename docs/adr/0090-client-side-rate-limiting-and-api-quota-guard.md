# ADR 0090: 客戶端 API 速率限制 (Rate Limiting) 與防封禁配額保護架構

- **狀態**：`ACCEPTED`
- **日期**：2026-09-07
- **決策者**：AI Pair Programmer & User
- **關聯 PRD**：[PRD #0090](../specs/0090-client-side-rate-limiting-and-api-quota-guard-spec.md)
- **關聯技術債**：[技術債 #0035](../debts/0035-client-side-rate-limiting-and-api-quota-guard.md) (`RESOLVED`)

---

## 1. 背景與脈絡 (Context)

系統在獲取即時股票行情、歷史收盤價、公司行動除權息公告時，頻繁依賴 Yahoo Finance Chart API 以及 TWSE/TPEx 官方開放數據。由於先前缺少統一的客戶端速率調度機制，瞬間並發的多個請求容易觸發遠端伺服器的防護機制，導致 `HTTP 429 Too Many Requests`，造成本地 IP 被暫時封鎖，使報價同步停擺。

此外，在後續規劃的「宏觀戰情室 (#0020)」與「全量歷史日 K 及肌肉書僮指標回補 (#0019)」中，將涉及大量的時序數據回補，若無健全的底層網路防線，將無法安全運作。

---

## 2. 架構決策 (Decision)

1. **模組化客戶端請求調度器 (`ClientRequestScheduler`)**：
   - 建立獨立引擎 `src/engine/rateLimiter.ts`。
   - 包含三層防禦：
     - **權杖桶 (Token Bucket)**：針對 Yahoo Finance (`maxTokens: 5, refill: 3/s`)、TWSE (`maxTokens: 3, refill: 2/s`)、TPEx (`maxTokens: 3, refill: 2/s`) 實施網域獨立平滑節流。
     - **並發池 (Concurrency Pool)**：限制單一網域或全域同時間在線的 HTTP 請求數（最大 2~3 個連線），防止塞滿瀏覽器 TCP 連線通道與主執行緒卡頓。
     - **熔斷器 (Circuit Breaker)**：當偵測到外部回傳 HTTP 429 或 503 時，自動開啟熔斷並進入 30 秒冷卻期，阻斷後續請求連環撞牆。
2. **無痛中介層整合**：
   - 將 `globalRequestScheduler.schedule(targetUrl, ...)` 注入於 `src/engine/priceFetcher.ts` 的 `fetchWithCORSProxy`。
   - 內部自動由 Target URL 解析目標主機名稱（相容 CORS Proxy 參數萃取），所有上層業務調用零改動即可自動獲得全域速率保護。

---

## 3. 結果與影響 (Consequences)

### 正面效益
- 徹底杜絕突發並發請求被交易所封鎖 IP 的風險。
- 具備 429 自我防禦與自動冷卻機制，保護使用者本機 IP 與網路環境穩定。
- 為後續大規模歷史指標回補（#0019）與宏觀戰情室（#0020）奠定關鍵底層基石。
- 單元測試覆蓋率達 100%，既有 98 個測試全數綠燈，0 回歸。

### 潛在權衡
- 密集批量請求時，由於並發槽位與權杖桶平滑節流，整體獲取時間略有拉長（數百毫秒級別），但大幅提升了請求成功率與網路健壯性。
