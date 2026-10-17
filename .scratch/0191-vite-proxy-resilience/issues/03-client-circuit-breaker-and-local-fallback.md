# 03 — 前端輕量短路熔斷器與本地歷史日 K 降級 (Client-Side Circuit Breaker & Fallback Fast-Fail)

**Parent:** #279

**What to build:**
在 `priceFetcher.ts` 內建輕量 In-Memory 熔斷狀態機（`CLOSED` ➔ `OPEN` ➔ `HALF-OPEN`）。當前端接收到本地代理回傳之 502（`ENOTFOUND`、DNS 異常或外部網路中斷）時，熔斷器立即轉為 `OPEN` 狀態（冷卻時間 60 秒）。在熔斷狀態下，後續所有標的的外部請求直接 Fast-Fail，跳過外部網路請求，並立即回退本機 IndexedDB / `tw_market_ohlcv_compact.json` 數據源。60 秒冷卻期滿後自動轉入 `HALF-OPEN` 允許單次試探，成功則復原為 `CLOSED`。

**Blocked by:** 01 — Vite 代理層錯誤抑制與安靜降噪, 02 — 標的市場精準後綴守衛

**Status:** RESOLVED

## Acceptance Criteria
- [x] 實現極簡 `CircuitBreaker` 狀態機，狀態包含 `CLOSED`、`OPEN`、`HALF-OPEN`。
- [x] 當本地代理返回 502 Gateway Error 且錯誤代碼為 `ENOTFOUND`、`EAI_AGAIN` 或 `ETIMEDOUT` 時，熔斷器立即切換為 `OPEN`。
- [x] 熔斷生效期間，`fetchWithCORSProxy` 秒級 Fast-Fail，`priceFetcher` 與 `historicalOhlcvBackfill` 立即回退本地歷史資料庫，跳過對其餘 30+ 檔標的的外部網路呼叫。
- [x] 60 秒冷卻後允許一次 probe 試探：成功則關閉熔斷器，失敗則延長熔斷 60 秒。
- [x] 支援顯式重置 API（供單元測試與手動連線測試使用）。
- [x] 撰寫單元測試覆蓋狀態機完整生命週期，包含觸發、短路阻斷、冷卻過期與試探恢復。
