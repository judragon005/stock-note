# Issue 02: fetchWithCORSProxy HTTP 404 Fast-Fail 快速終止防禦

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `network`
- 關聯 Issue：#3

## 任務說明
1. 修改 `src/engine/priceFetcher.ts` 中的 `fetchWithCORSProxy`：
   - 增加對 HTTP 404 狀態碼的識別。
   - 若本地代理 `/api/yahoo`、`/api/twse` 等返回 404，代表遠端確定查無該資源（如標的不存在或下市）。
   - 立即拋出非暫態錯誤終止，杜絕進入 3 個外部 CORS 代理池重複輪詢 24 秒。
2. 在 `src/engine/priceFetcher.test.ts` 新增測試驗證 404 快速終止行為。
