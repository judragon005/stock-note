# ADR 0175: 外部金融 API 整合控制台健康探針修復與 CSP/CORS 網路防禦架構

## 狀態
已採納 (Accepted) - 2026-10-09

## 關聯規格
- [Spec 0175: 外部金融 API 整合控制台健康探針修復與 CSP/CORS 網路防禦規格書](file:///d:/APP/股票紀錄/docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md)
- Issue #209 / PR #211, #212, #213

## 背景與痛點
在外部金融 API 控制台 (`UnifiedApiKeyManager`) 與 QNAP NAS 生產部署環境中，使用者在輸入正確金鑰後遭遇連線阻斷問題：
1. **CSP 阻斷 (Content Security Policy)**：瀏覽器因缺少 W3C `connect-src` 白名單，將 Finnhub (`https://finnhub.io`)、FRED (`https://api.stlouisfed.org`)、SEC 等外部 API 探針請求於客戶端直接攔截 (`Failed to fetch`)。
2. **CORS 跨來源限制**：FRED 官方 API 端點未提供 `Access-Control-Allow-Origin` 標頭，純前端瀏覽器直連必定觸發跨來源錯誤。
3. **FMP 免費方案端點失效**：探針寫死舊版 `/api/v3/profile/AAPL` 付費端點，新版 FMP 免費帳號直接回傳 403 Forbidden。
4. **NAS 容器環境路由解析異常**：在 Docker/NAS 部署環境中，`prod-server.cjs` 缺乏通用反向代理通道，導致跨網域資料抓取失敗。

## 決策核心架構

### 1. CSP 白名單全量防禦 (`src/engine/cspSecurity.ts` & `index.html`)
- 在 `WHITELISTED_CONNECT_DOMAINS` 中明確補齊：
  - `https://finnhub.io`
  - `https://api.stlouisfed.org`
  - `https://api.polygon.io`
  - `https://api.coingecko.com`
  - `https://data.sec.gov`
- 同步將宣告注入至根目錄 `index.html` 的 `<meta http-equiv="Content-Security-Policy">`，維護前端連線安全白名單。

### 2. 金融探針端點升級與代理感知 (`src/engine/apiKeyHealthProbe.ts`)
- **FMP 免費端點對齊**：將測活端點切換為免費方案相容之 `/stable/quote?symbol=AAPL&apikey=...`。
- **代理通道感知**：`probeApiKey` 擴充 `proxyUrl` 參數支援，若傳入代理位址或針對無 CORS 支援之端點（如 FRED），由代理伺服器轉發。
- **UI 控制台連動**：在 `UnifiedApiKeyManager` 中支援將使用者自訂之 `customProxyUrl` 傳入探針，達成無縫測活。

### 3. NAS 容器專用安全反向代理 (`docs/deployment/server/prod-server.cjs`)
- 在生產伺服器新增 `/api/proxy?url=<encoded_target_url>` 通用代理端點。
- 強制 SSRF 防禦：代理目標僅允許 `WHITELISTED_CONNECT_DOMAINS` 白名單內之金融服務網域，拒絕內網與任意未授權 IP。

### 4. 決策影響與後續追蹤
- 徹底修復 Finnhub、FMP、FRED、Polygon 等多來源金融金鑰在前端與 NAS 部署下的測活可用性。
- 將跨裝置雲端金鑰同步與 NAS 集中金鑰保險庫歸檔為技術債 [Debt 0046](file:///d:/APP/股票紀錄/docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md)。
