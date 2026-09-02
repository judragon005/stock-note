# 技術債 #0031: 公共 CORS 代理憑證防洩漏與安全邊界路由機制

- **狀態**：`OPEN`
- **優先級**：`P1`
- **發現來源**：資安架構深度審查
- **建立日期**：2026-09-02
- **標籤**：`Security` · `Network` · `CORS` · `Privacy` · `MITM`

---

## 1. 背景與現狀代碼 (Context & Current Code)

專案中的 `src/engine/priceFetcher.ts` 與 `src/engine/corporateActionScanner.ts` 配置了公共第三方 CORS 代理清單：

```typescript
// src/engine/priceFetcher.ts
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];
```

當前端無法直連或本地 Vite Proxy 不可用時，引擎會依序嘗試上述公共 CORS 代理發送 HTTP 請求。

---

## 2. 問題分析與潛在風險 (Problem & Risk Analysis)

1. **憑證洩漏與中間人竊聽 (Third-Party Token Logging / MITM)**：
   - 若未來擴充付費金融 API（如 FinMind、FMP、AlphaVantage 等），請求 URL 或 Header 中常帶有 `token=xyz` 或 `apikey=abc`。
   - 一旦透過公共代理池轉發，使用者的私人金鑰將直接曝光於第三方公共伺服器的 HTTP Access Log、代理節點記憶體與快取中，造成嚴重的 API Key 洩漏。
2. **惡意中間人篡改數據 (Data Tampering)**：
   - 公共 CORS 代理若被惡意節點劫持，可能篡改返回的股票報價、歷史價格或除息公告數據，誤導投資決策與質押試算。
3. **SSRF 與釣魚 Proxy 漏洞**：
   - 使用者在設定中輸入的「自訂 Proxy URL」若未經嚴格的協定 (HTTPS) 與格式校驗，可能被誘導填入釣魚代理或內網惡意端點。

---

## 3. 建議重構方案 (Proposed Security Architecture)

建立**「零憑證洩漏 (Zero-Credential Leak)」安全網路路由中介層**：

```mermaid
flowchart TD
    Req[發起外部 API 請求] --> Check{是否帶有 API Token / 憑證?}
    Check -->|是 (敏感請求)| SecureRoute[安全路由通道]
    Check -->|否 (純公開無憑證數據)| FallbackPool[公共 CORS 代理池]

    SecureRoute --> ViteProxy[1. 本地 Vite/Desktop 安全代理]
    SecureRoute --> DirectCORS[2. 官方原生 CORS 直連]
    SecureRoute --> CustomTLS[3. 使用者自建受信任 HTTPS 私人代理]
    SecureRoute -.->|嚴格攔截| Block[❌ 禁止流向公共 CORS Proxy]
```

### 核心防護機制：
1. **無憑證路由硬防禦 (Zero-Token Invariant Guard)**：
   - 在 `fetchWithCORSProxy` 入口處加入憑證敏感字詞檢測（如 `token=`, `apikey=`, `key=`, `Authorization`）。
   - 若包含敏感字詞且試圖轉發至 `corsproxy.io`、`allorigins` 或 `codetabs`，立即主動中斷並拋出 `SecurityCredentialLeakException`，嚴禁任何外發。
2. **自訂 Proxy 嚴格校驗 (Custom Proxy Whitelist & Validation)**：
   - 強制要求自訂 Proxy 必須為標準 `https://` 協定（開發環境除外）。
   - 拒絕 `javascript:`, `data:`, `file:`, `localhost`, `127.0.0.1`, `192.168.*` 等非法或內網 SSRF 敏感位址。
3. **響應完整性防禦**：
   - 針對公共代理返回的 JSON 結構進行嚴格的 Schema 邊界校驗，若格式異常即刻棄用，防止惡意注入偽造行情。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] 傳入帶有 `token=` 或 `apikey=` 之 URL 至 `fetchWithCORSProxy` 時，公共 CORS 代理池自動被完全隔離跳過，絕不發出請求。
- [ ] 設定頁面驗證自訂 Proxy URL：填入非 HTTPS 或惡意協定時，立即反白紅字阻擋儲存。
- [ ] 單元測試驗證安全路由閘門攔截邏輯與各種 URL 參數排列組合的防洩漏測試。

---

## 5. 觸發處理時機 (Trigger Conditions)

- 串接 FinMind 歷史指標回補 (Debt #0019) 或 FMP 宏觀流動性 (Debt #0020) 時。
