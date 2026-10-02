# 05 — index.html 生產級 CSP Meta 標籤注入 (index.html CSP Meta Tag)

**What to build:** 
在專案根目錄 `index.html` 的 `<head>` 中注入嚴格符合 W3C 標準之 `<meta http-equiv="Content-Security-Policy">` 標籤，確保在任何靜態託管（如 GitHub Pages、Cloudflare、本機靜態伺服器）環境中皆具備外邊界防護。

**Blocked by:** 04-csp-security-engine

**Status:** ready-for-agent

- [x] 在 `index.html` 注入 `<meta http-equiv="Content-Security-Policy">`
- [x] 限制 `default-src 'self'`, `script-src 'self' 'unsafe-eval'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- [x] 限制 `font-src 'self' https://fonts.gstatic.com data:`
- [x] 限制 `connect-src` 僅允許白名單 API、本機自連與 Vite HMR
- [x] 驗證靜態載入時無非預期 CSP 報錯且字型/圖示正常載入
