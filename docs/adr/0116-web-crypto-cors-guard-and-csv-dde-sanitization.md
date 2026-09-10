# ADR 0116: Web Crypto 敏感金鑰加密、公共 CORS 代理零憑證防洩漏與 CSV DDE 公式注入防禦

## 狀態
已通過 (Accepted) - 2026-09-10

## 脈絡與背景 (Context)
隨著投資分析儀由單純的「本機離線記帳」演進為「多市場即時報價、法人籌碼穿透、宏觀戰情室與外部 API 深度整合」之綜合金融終端，系統在客戶端 (Client-side) 面臨三大嚴峻的資訊安全與隱私洩漏隱患（對應技術債 `Debt #0030`, `Debt #0031`, `Debt #0032`）：
1. **儲存端明文金鑰暴露 (Debt #0030)**：使用者付費金融 API 權杖（FinMind Token、FMP API Key、AlphaVantage Key）於 `localStorage` 與 `IndexedDB` 中以明文 JSON 存放，易受同源 XSS 或實體螢幕窺探。
2. **傳輸端公共代理竊聽與洩漏 (Debt #0031)**：前端跨域連線依賴第三方公共 CORS 代理池（`corsproxy.io`、`allorigins.win`、`codetabs.com`），若 API 請求攜帶 Token，易導致私有憑證被第三方伺服器 Access Log 永久記錄甚至遭遇 MITM 竊聽；自訂 Proxy 缺乏協定與 SSRF 阻斷。
3. **資料進出端公式注入與備份外流 (Debt #0032)**：CSV 匯出缺乏 OWASP 儲存格轉義，使用者文字若包含 `=, +, -, @, \t, \r` 開頭易觸發 Excel 動態資料交換 (DDE) 代碼執行 (RCE)；全庫 JSON 備份檔未提供脫敏機制。

## 決策細節 (Decision Details)

### 1. Web Crypto 密碼學加密核心與平滑遷移 (`cryptoEngine.ts`)
- **標準與演算法**：全面基於原生 W3C `window.crypto.subtle` API，零第三方套件依賴。
  - 對稱加密：`AES-GCM 256-bit`。
  - 金鑰衍生：`PBKDF2` 搭配 `HMAC-SHA-256`，疊代次數為 100,000 次（符合 NIST SP 800-132 標準）。
  - 動態隨機熵：每次加密獨立生成 16-byte (128-bit) Salt 與 12-byte (96-bit) IV。
- **密文封裝規格 (`EncryptedPayload`)**：
  定義包含 `version: 1`, `algorithm: 'AES-GCM'`, `salt`, `iv`, `ciphertext` 之標準結構。
- **平滑遷移與抗篡改**：
  - 實作 `CryptoDecryptionError`，錯誤密碼解密時強制阻斷垃圾資料外洩。
  - `migrateApiKeysConfig` 自動將歷史版本明文字串就地加密升級為密文封裝。

### 2. 零憑證安全邊界路由閘門與 SSRF 防禦 (`secureProxyRouter.ts`)
- **敏感憑證檢測字典**：
  自動檢測 URL 參數與 HTTP 標頭：`['token', 'apikey', 'api_key', 'key', 'secret', 'authorization', 'bearer']`。
- **實體外發邊界隔離**：
  - 若請求帶有憑證，候選節點中 100% 排除公共代理池，僅允許官方直連、本地開發 Vite 代理或白名單私有 HTTPS 代理；若強制試圖外發則拋出 `SecurityCredentialRoutingError` 終止請求。
  - 純公開無憑證數據（如 Yahoo 財務公開報價）保留向後相容的公共代理降級容錯。
- **自訂 Proxy SSRF 防禦**：
  - 強制傳輸協定必須為 `https:`。
  - 阻斷私有 IPv4 保留段（`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`）與雲端 Metadata 位址（`169.254.169.254`）。

### 3. OWASP CSV DDE 消毒與全庫備份脫敏 (`csvSanitizer.ts`)
- **OWASP 儲存格消毒 (`sanitizeCSVCell`)**：
  - 對於以 `=, +, -, @, \t, \r` 開頭的文字儲存格，前置單引號 `'` 並以雙引號包裹，使試算表軟體視為純文字處理。
  - 數值型態欄位（成交價、股數、費用、稅費）維持原生數值格式輸出，確保 Excel 統計運算功能無損。
- **備份脫敏機制 (`redactBackupData`)**：
  - 在全庫資料庫匯出時提供「脫敏匯出」開關（預設勾選），自動將 `settings.apiKeys` 中的所有金鑰抹除為空字串，並在元數據中寫入 `{ isRedacted: true }`。

## 影響評估 (Consequences)
- **正面效益**：
  - 使用者私有金融 API 權杖無論在靜態硬碟、傳輸過程或備份分享時均具備商用級安全屏障。
  - 消除試算表匯出之本機代碼執行漏洞，全面符合金融業資安合規要求。
  - 0 外部依賴，純標準原生 Web API，打包大小零增加。
- **折衷與邊界 (Trade-offs & Boundaries)**：
  - 密文封裝在未指定主密碼時採用本機隨機種子透明加密，兼顧使用者體驗與靜態保護；需透過主密碼解鎖才能提供跨裝置或防實體窺探之最高防護。

## 關聯項目 (Related Items)
- 規格書：[0116-web-crypto-cors-guard-and-csv-dde-sanitization-spec.md](../specs/0116-web-crypto-cors-guard-and-csv-dde-sanitization-spec.md)
- GitHub Issue：[Issue #17](https://github.com/judragon005/stock-note/issues/17)
- Pull Request：[PR #18](https://github.com/judragon005/stock-note/pull/18)
- 關聯技術債：`Debt #0030`, `Debt #0031`, `Debt #0032` (全數標記為 RESOLVED)
