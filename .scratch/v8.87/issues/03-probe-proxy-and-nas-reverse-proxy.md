# Ticket 03: 探針代理感知升級與 NAS 通用反向代理路由

## 關聯規格
- Spec: `docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md` (3.2 & 3.3)
- Issue: #209

## 問題背景
1. FRED 官方 API 僅提供 Server-to-Server 調用，未提供 CORS 跨域標頭，純前端直連必然失敗。
2. 控制台提供自訂代理輸入框，但探針代碼 `probeApiKey` 未傳遞該參數，導致代理設定無效。
3. NAS 容器環境已運行 Node.js 伺服器，但缺少通用外部金融代理路由。

## 任務細節
1. 修改 `src/engine/apiKeyHealthProbe.ts`：
   - 在 `KeyProbeOptions` 新增 `proxyUrl?: string`。
   - 當傳入 `proxyUrl` 時，將探針請求編碼轉發至該代理。
2. 修改 `src/components/UnifiedApiKeyManager.tsx`：
   - 點擊測活時，將使用者配置之 `customProxyUrl` 傳入 `probeApiKey`。
3. 修改 `docs/deployment/server/prod-server.cjs`：
   - 建立安全反向代理 `handleGenericProxy` 與端點 `/api/proxy?url=...` 及 `/api/fred/*`。
   - 加入 SSRF 網域白名單防禦與自動注入 `Access-Control-Allow-Origin: *`。

## 驗收標準
- [x] 單元測試 `apiKeyHealthProbe.test.ts` 驗證自訂 Proxy 轉發格式正確。
- [x] NAS 伺服器支援 `/api/proxy` 轉發，解決 FRED 跨域限制。
