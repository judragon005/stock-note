# 規格書 0175：外部金融 API 整合控制台健康探針修復與 CSP/CORS 網路防禦規格書 (Spec 0175)

## 1. 摘要 (Summary)

本規格書針對外部金融 API 控制台 ([`UnifiedApiKeyManager`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/src/components/UnifiedApiKeyManager.tsx)) 在瀏覽器端與 QNAP NAS 部署環境中，使用者輸入有效金鑰卻遭遇「`連線失敗: Failed to fetch`」與「`403 Unauthorized/Forbidden`」的重大網路與架構缺陷進行修復（路徑 A）。同時將跨裝置金鑰同步與中央全端代理列為長期演進技術債（路徑 B / Debt 0046）。

---

## 2. 問題診斷與第一性原理剖析 (Root Causes)

| 服務提供者 | 報錯現象 | 底層第一性原因 | 修復方案 (路徑 A) |
| :--- | :--- | :--- | :--- |
| **Finnhub** | `連線失敗: Failed to fetch` | 專案 W3C CSP 標頭 `connect-src` 遺漏 `https://finnhub.io`，遭瀏覽器沙盒掐斷。 | 補全 `index.html` 與 `cspSecurity.ts` 之 CSP 白名單。 |
| **FRED** | `連線失敗: Failed to fetch` | 1. CSP 遺漏 `https://api.stlouisfed.org`。<br>2. 官方 API 無 `Access-Control-Allow-Origin` (CORS)。<br>3. 探針代碼直連，未串接代理。 | 1. 補全 CSP。<br>2. 探針 `probeApiKey` 支援代理轉發。<br>3. NAS `prod-server.cjs` 增設 `/api/proxy` 通用安全轉發。 |
| **FMP** | `403 Forbidden` | 探針寫死舊版或付費受限端點 `/api/v3/profile/AAPL`，新版免費方案遭拒絕。 | 更新探針端點至免費方案相容端點 `/stable/quote?symbol=AAPL` 或相容端點。 |
| **Polygon / CoinGecko / SEC** | 潛在 CSP 違規 | 網域未列入 CSP 白名單，後續呼叫將必定報錯。 | 擴充 CSP 白名單涵蓋所有支援之 Provider。 |

---

## 3. 功能規格與架構變更 (Detailed Specifications)

### 3.1 CSP 安全白名單全面對齊 (CSP Security Alignment)
1. 在 [`src/engine/cspSecurity.ts`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/src/engine/cspSecurity.ts) 之 `WHITELISTED_CONNECT_DOMAINS` 中加入：
   - `https://finnhub.io`
   - `https://api.stlouisfed.org`
   - `https://api.polygon.io`
   - `https://api.coingecko.com`
   - `https://data.sec.gov`
2. 同步更新根目錄 [`index.html`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/index.html) 的 `<meta http-equiv="Content-Security-Policy">` 中的 `connect-src` 宣告。

### 3.2 探針端點與代理感知升級 (Probe Endpoint & Proxy-Aware Upgrade)
1. **FMP 免費端點優化**：
   - 探針測試 URL 由舊版付費受限的 `/api/v3/profile/AAPL` 遷移至 `/stable/quote?symbol=AAPL&apikey=...`，並在 403 時提供明確提示。
2. **探針支援 Proxy 轉發**：
   - `probeApiKey(provider, key, fetcher, options)` 增加 `proxyUrl?: string` 選項。
   - 若傳入 `proxyUrl`，將請求轉由代理發送；若為瀏覽器直連無 CORS 的端點（如 FRED），優先透過代理或安全轉發管道。
3. **控制台接軌**：
   - 在 [`UnifiedApiKeyManager.tsx`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/src/components/UnifiedApiKeyManager.tsx) 中，點選「測活」按鈕時，將使用者設定的 `customProxyUrl` 傳入 `probeApiKey`。

### 3.3 NAS 伺服器代理補全 (NAS Server Proxy Gateway)
1. 在 [`docs/deployment/server/prod-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/server/prod-server.cjs) 中新增通用安全反向代理端點：
   - `/api/proxy?url=<encoded_target_url>`，專門代理 FRED 等非 CORS 外部金融 API。
   - 僅允許代理 `WHITELISTED_CONNECT_DOMAINS` 名單內的網址，防止 SSRF 攻擊。

---

## 4. 測試計畫與驗證標準 (Verification Criteria)

1. **單元測試**：
   - `cspSecurity.test.ts`：驗證所有金融 Provider 網域均在 CSP 白名單中。
   - `apiKeyHealthProbe.test.ts`：
     - 驗證 FMP 探針使用 `/stable/quote` 端點。
     - 驗證 `probeApiKey` 能正確處理 `proxyUrl` 轉發參數。
     - 驗證 Finnhub 與 FRED 請求構造正確。
2. **建置驗證**：
   - `npm test` 100% 通過。
   - `npm run build` TypeScript 0 錯誤。
