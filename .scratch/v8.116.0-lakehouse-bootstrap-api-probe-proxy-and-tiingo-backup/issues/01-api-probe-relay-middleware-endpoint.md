# 01 — 本地測活代理中繼路由端點 (Vite Middleware)

**Category:** bug
**Status:** closed
**Blocked by:** None — can start immediately

**What to build:**
使用者在瀏覽器前端進行 API 金鑰測試時，因第三方伺服器（FRED、Alpha Vantage、FMP、SEC 等）未設定或禁止 CORS 而遭遇瀏覽器直接攔截（回傳 `TypeError: Failed to fetch` 且 HTTP 狀態碼為 0）。本切片在本地 Vite Connect 中介層 `scripts/market-sync/vite-market-middleware.cjs` 建立 `POST /api/market/probe-key` 端點，由 Node.js 環境代為發送 HTTP 請求，徹底消滅 CORS 阻斷，並將第三方伺服器回傳之真實 HTTP 狀態碼與回應 Body 穿透回傳。

**Acceptance criteria:**
- [x] `POST /api/market/probe-key` 支援接收 `{ targetUrl, method, headers }` 並由 Node.js 代為發送
- [x] 支援附加合規之 `User-Agent: StockTracker/1.0 (local-probe)`
- [x] 成功或失敗時，均如實穿透第三方之 HTTP Status 與 Response Body，不吞噬錯誤
- [x] 撰寫單元與中介層測試驗證端點之轉發與錯誤透傳行為

