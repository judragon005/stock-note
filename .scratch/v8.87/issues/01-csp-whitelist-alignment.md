# Ticket 01: CSP 內容安全策略白名單對齊 (Finnhub, FRED, Polygon, CoinGecko, SEC)

## 關聯規格
- Spec: `docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md` (3.1)
- Issue: #209

## 問題背景
外部金融 API 控制台支援了 Finnhub、FRED、Polygon、CoinGecko、SEC 等多個外部資料供應商，但在 `index.html` 與 `cspSecurity.ts` 的 `connect-src` 白名單中遺漏了對應網域，導致前端瀏覽器發送 fetch 請求時被 CSP 安全策略掐斷，拋出 `TypeError: Failed to fetch`。

## 任務細節
1. 修改 `src/engine/cspSecurity.ts`：
   - 在 `WHITELISTED_CONNECT_DOMAINS` 中加入：
     - `https://finnhub.io`
     - `https://api.stlouisfed.org`
     - `https://api.polygon.io`
     - `https://api.coingecko.com`
     - `https://data.sec.gov`
2. 修改 `index.html`：
   - 同步更新 `<meta http-equiv="Content-Security-Policy">` 中的 `connect-src` 宣告。
3. 更新單元測試 `src/engine/cspSecurity.test.ts`：
   - 驗證上述新網域皆包含在白名單中。

## 驗收標準
- [x] `npx vitest run src/engine/cspSecurity.test.ts` 100% 通過。
- [x] 瀏覽器不再因 CSP 違規而阻擋 `finnhub.io` 等合法金融端點。
