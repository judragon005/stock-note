# 01 — Vite 代理層錯誤抑制與安靜降噪 (Vite Proxy Error Suppression & Noise Shield)

**Parent:** #279

**What to build:**
在 Vite 開發伺服器配置中擴充 `/api/yahoo` 等代理路由的錯誤監聽器。攔截 `ENOTFOUND`、`EAI_AGAIN`、`ETIMEDOUT` 與 `ECONNRESET` 等 DNS 解析與連線異常，以單行精簡警告代替 Node.js 冗長的紅色多行堆疊追蹤。當外部無法連線時，統一回傳乾淨的 HTTP 502 狀態碼與標準結構化 JSON 錯誤負載，使終端機保持整潔，同時讓前端能快速識別代理錯誤。

**Blocked by:** None — can start immediately

**Status:** RESOLVED

## Acceptance Criteria
- [x] 在 `vite.config.ts` 中的 proxy 錯誤處理器增加對 `ENOTFOUND`、`EAI_AGAIN`、`ETIMEDOUT` 的模式識別。
- [x] 遇到上述暫態網路錯誤時，終端機僅輸出單行 `console.warn`，不噴發多行錯誤堆疊追蹤。
- [x] 代理在攔截到錯誤時回傳 HTTP 502，Content-Type 為 `application/json`，且 JSON 包含 `{ error: 'Proxy Gateway Error', code: err?.code }`。
- [x] 既有之 `ECONNRESET` 降噪行為保持不變。
