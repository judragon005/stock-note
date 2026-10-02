# 04 — 內容安全策略 (CSP) 規格字串與驗證器 (CSP Security Engine)

**What to build:** 
建立 `src/engine/cspSecurity.ts`，定義專案系統之內容安全策略常數、指令解析與外發網址合規性校驗純函式 `isAllowedConnectUrl(url: string): boolean`。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 定義標準 CSP 指令字串生成器 `generateCspHeaderValue()`
- [x] 納入已授權官方與第三方金融 API：Yahoo Finance, TWSE, TPEx, FinMind, FMP, AlphaVantage, 以及公共 CORS 代理池
- [x] 支援本地開發環境 Vite HMR 通信位址 (`ws://localhost:*`, `ws://127.0.0.1:*`)
- [x] 實作 `isAllowedConnectUrl`，精準阻斷未授權之任意外部資料外洩連線（如 `https://evil-exfil.com`）
- [x] 單元測試 100% 覆蓋合法 API 與非法攻擊網址之判定
