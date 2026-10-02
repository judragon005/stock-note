# 06 — Vite 開發與預覽環境 HTTP 安全防禦標頭 (Vite Security Headers)

**What to build:** 
於 `vite.config.ts` 中的 `server.headers` 與 `preview.headers` 配置完整的 HTTP 安全標頭。補充 Meta 標籤不支援之安全特性（如 `X-Frame-Options: DENY` 與 `frame-ancestors 'none'`），徹底阻斷點擊劫持與 MIME 欺騙。

**Blocked by:** 04-csp-security-engine

**Status:** ready-for-agent

- [x] 在 `vite.config.ts` 的 `server.headers` 配置安全標頭
- [x] 在 `vite.config.ts` 的 `preview.headers` 配置相同之安全標頭
- [x] 配置 `X-Frame-Options: DENY`
- [x] 配置 `X-Content-Type-Options: nosniff`
- [x] 配置 `Referrer-Policy: strict-origin-when-cross-origin`
- [x] 配置包含 `frame-ancestors 'none';` 之完整 Content-Security-Policy Header
- [x] 驗證 Vite dev server 與 preview 啟動無破壞，通訊正常
