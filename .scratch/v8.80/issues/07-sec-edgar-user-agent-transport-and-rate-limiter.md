# 07-sec-edgar-user-agent-transport-and-rate-limiter

## Description
建置美國證券交易委員會官方「SEC EDGAR」傳輸中介層。負責美股代碼對應官方中央索引碼（CIK）、在請求標頭中注入 SEC 官方合規政策強制要求的自訂 `User-Agent`，並受每秒最多 10 次之獨立速率限制（Rate Limiter）保護。

## Target Files
- `src/engine/secEdgarTransport.ts`
- `src/engine/secEdgarTransport.test.ts`

## Acceptance Criteria
- [x] 實作美股 Ticker 至 CIK 碼轉換對照表或線上對應模組（補齊至 10 位數例如 AAPL -> `0000320193`）。
- [x] 所有對 `data.sec.gov` 發出的請求，Header 必須強制攜帶合規之 User-Agent（格式：`StockTracker/1.0 (dev-contact@local.portfolio)`）。
- [x] 內建獨立的 10 req/sec 令牌桶節流，嚴禁超過官方閥值。
- [x] 串接本機 Vite 反向代理 `/api/sec-edgar` 避免瀏覽器 CORS 阻擋。
- [x] 撰寫單元測試驗證 CIK 映射、User-Agent 注入及 10 req/sec 節流生效。

## Status
- [x] done
