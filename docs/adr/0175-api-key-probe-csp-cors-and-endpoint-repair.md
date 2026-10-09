# ADR 0175：外部金融 API 控制台健康探針修復與 CSP/CORS 網路防禦架構決策 (ADR 0175)

- **狀態**：`ACCEPTED`
- **日期**：2026-10-09
- **關聯規格**：[Spec 0175](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md)
- **關聯技術債**：[Debt 0046](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md)
- **關聯 Issue**：#209 / PR #212

---

## 1. 背景與問題情境 (Context)

在 QNAP NAS 等私有雲部署環境或一般瀏覽器訪問中，使用者在「外部金融 API 整合控制台」輸入經確認有效之金鑰時遭遇嚴重連線錯誤：
1. **Finnhub (`Failed to fetch`)**：因專案 `connect-src` CSP 安全白名單遺漏 `https://finnhub.io`，遭瀏覽器強制掐斷連線。
2. **FRED (`Failed to fetch`)**：聯準會官方 API 僅提供 Server-to-Server 呼叫，無 W3C CORS 標頭，且探針直連未走反向代理。
3. **FMP (`403 Forbidden`)**：探針測試端點寫死舊版付費專屬的 `/api/v3/profile/AAPL`，導致新版免費金鑰無法通過驗證。

---

## 2. 決策考量與實現 (Decision Drivers & Implementation)

秉持 KISS 原則與零依賴原則，採用「路徑 A 立即修復 + 路徑 B 列入技術債」雙軸演進：

1. **CSP 白名單全量對齊**：
   - 於 `src/engine/cspSecurity.ts` 與 `index.html` 補齊 Finnhub、FRED、Polygon、CoinGecko、SEC 等所有支援 Provider 的網域。
2. **FMP 探針端點升級**：
   - 遷移至相容免費用量與新版架構之 `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${key}`。
   - 優化 403 錯誤資訊，明確提示方案權限與端點限制。
3. **探針代理感知與 NAS 伺服器通用轉發**：
   - `probeApiKey` 擴充 `proxyUrl` 選項，並在 `UnifiedApiKeyManager` 點選測活時傳入使用者的 `customProxyUrl`。
   - 在 `docs/deployment/server/prod-server.cjs` 增設通用反向代理 `/api/proxy?url=...` 與 `/api/fred/*`，自動注入 `Access-Control-Allow-Origin: *` 並內建 SSRF 白名單防禦。
4. **架構演進防禦隔離**：
   - 將「跨設備 LocalStorage 隔離」與「後端 SQLite 集中金鑰保險箱」列入 [Debt 0046](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md)。

---

## 3. 結果與影響 (Consequences)

### 正向效益 (Positive)
* 使用者在控制台測試 Finnhub、FMP、FRED 金鑰時能順利顯示健康綠燈。
* NAS 伺服器發揮反向代理能力，杜絕純前端無法呼叫無 CORS 服務的痛點。
* 具備完整 SSRF 防禦，保障伺服器安全。

### 潛在權衡 (Trade-offs)
* 純前端 LocalStorage 依然受限於瀏覽器 Origin 隔離，不同電腦或手機間需手動匯入金鑰，待後續 Debt 0046 推進至後端 SQLite 金鑰庫。
