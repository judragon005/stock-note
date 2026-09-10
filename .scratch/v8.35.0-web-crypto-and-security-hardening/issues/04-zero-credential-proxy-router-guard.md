# 04 — 零憑證安全邊界路由閘門 (Zero-Credential Proxy Router Guard)

**What to build:**
實作網路中介層核心防護模組 `secureProxyRouter.ts`。在任何對外發起 HTTP 請求的管道中（含股價爬取、財報拉取、宏觀指標等），自動審查 URL 參數與 HTTP 標頭。若偵測到請求攜帶敏感憑證特徵字詞（`['token', 'apikey', 'api_key', 'key', 'secret', 'authorization', 'bearer']`），硬性限制其僅能透過「官方直連 (Direct Fetch)」、「本地 Vite 代理」或「使用者設定之白名單私有 HTTPS 代理」，絕對 100% 阻斷轉發至公共 CORS 代理池（`corsproxy.io`, `allorigins.win`, `codetabs.com`）。一旦偵測試圖外發，立即拋出 `SecurityCredentialRoutingError` 終止請求。純公開無憑證之請求則維持彈性降級。

**Blocked by:** None — can start immediately

**Status:** complete

- [x] 定義敏感憑證特徵字典與 `SecurityCredentialRoutingError` 自訂異常型別
- [x] 實作 `inspectAndRouteRequest` 函數，解析 URL 查詢參數與標頭判斷是否含敏感權杖
- [x] 若含有憑證，強制封鎖所有公共 CORS 代理候選節點，僅保留直連與信任代理
- [x] 若為純公開數據（如 Yahoo 財務無憑證行情），保留向後相容的公共代理降級容錯鏈路
- [x] 單元測試於 `src/engine/secureProxyRouter.test.ts` 驗證各類帶 Token 與不帶 Token URL 的路由白名單與阻斷決策
