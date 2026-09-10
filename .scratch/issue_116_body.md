## 概述 (Overview)

實作 PRD #0116 所定義之全鏈路客戶端安全加固功能，徹底解決技術債 **Debt #0030**、**Debt #0031** 與 **Debt #0032**：
1. **Web Crypto 敏感金鑰加密 (Debt #0030)**：使用標準 W3C `window.crypto.subtle` (AES-GCM 256-bit + PBKDF2 100,000 次疊代) 加密持久化存儲使用者 API 金鑰，支援原地自動遷移 (Auto-Migration) 與防窺遮罩 UI。
2. **CORS 代理零憑證防洩漏與安全邊界路由 (Debt #0031)**：實作 `secureProxyRouter` 路由中介層，偵測敏感憑證參數（token/apikey/auth）並 100% 阻斷流向公共 CORS 代理池；同時對自訂 Proxy 進行 HTTPS 校驗與私有內網/雲端 Metadata SSRF 阻斷。
3. **CSV DDE 公式注入防禦與備份脫敏 (Debt #0032)**：實作 OWASP 標準儲存格消毒過濾器（前置單引號 `'` 中和 `=, +, -, @, \t, \r` 危險字元），並提供全庫 JSON 備份脫敏匯出功能。

---

## 驗收標準與測試縫隙 (Acceptance Criteria & Test Seams)

- [x] **縫隙 1：密碼學引擎 (`src/engine/cryptoEngine.test.ts`)**
  - [x] 支援 AES-GCM 256-bit 加解密與 PBKDF2 (100,000 次) 金鑰衍生
  - [x] 每次加密具備隨機 16-byte Salt 與 12-byte IV (不同密文)
  - [x] 錯誤密碼拋出明確資安異常，杜絕垃圾資料外洩
  - [x] 既有明文 API Key 讀取時原地自動平滑遷移 (Auto-Migration) 升級為密文

- [x] **縫隙 2：安全網路路由閘門 (`src/engine/secureProxyRouter.test.ts`)**
  - [x] 偵測含 Token/API Key 之請求，100% 禁止轉發至公共 CORS 代理池
  - [x] 純公開無憑證之請求維持相容降級
  - [x] 自訂 Proxy 驗證強制 HTTPS，阻斷私有內網 IP (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`) 與雲端 Metadata (`169.254.169.254`)

- [x] **縫隙 3：CSV 消毒與備份脫敏 (`src/engine/csvSanitizer.test.ts`)**
  - [x] OWASP 6 種危險字元 (`=, +, -, @, \t, \r`) 前置單引號消毒並雙引號包裹
  - [x] 數值型別（股數、成交價、費用）維持原生數值格式，不影響試算表計算
  - [x] 全庫 JSON 備份支援一鍵脫敏匯出，清空 API 金鑰並標記 `isRedacted: true`

---

## 關聯文件

- 規格書：`docs/specs/0116-web-crypto-cors-guard-and-csv-dde-sanitization-spec.md`
- 技術債：`docs/debts/0030-web-crypto-api-key-encryption-and-secure-storage.md`, `0031-cors-proxy-credential-leak-prevention-and-safe-routing.md`, `0032-csv-formula-injection-and-json-data-sanitization.md`
- 本地票券鏡像：`.scratch/v8.35.0-web-crypto-and-security-hardening/issues/`
