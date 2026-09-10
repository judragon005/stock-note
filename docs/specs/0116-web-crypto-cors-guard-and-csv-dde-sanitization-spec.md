# 需求規格說明書 (PRD 0116)：Web Crypto 敏感金鑰加密、CORS 代理零憑證防洩漏與 CSV DDE 公式注入防禦

- **規格編號**：`PRD #0116`
- **對應架構決策 (ADR)**：`ADR #0116`
- **關聯技術債**：
  - [**Debt #0030**](../debts/0030-web-crypto-api-key-encryption-and-secure-storage.md) (`P1`): Web Crypto API 敏感金鑰加密與端到端保密持久化
  - [**Debt #0031**](../debts/0031-cors-proxy-credential-leak-prevention-and-safe-routing.md) (`P1`): 公共 CORS 代理憑證防洩漏與安全邊界路由機制
  - [**Debt #0032**](../debts/0032-csv-formula-injection-and-json-data-sanitization.md) (`P2`): CSV 公式注入防禦 (DDE Protection) 與備份匯出脫敏機制
- **狀態**：`Ready for Review / Ready for Agent`
- **建立日期**：2026-09-10
- **主要受眾**：全端工程師、資安架構師、金融量化交易員

---

## 一、問題陳述 (Problem Statement)

隨著投資分析儀由單純的「本機離線記帳」演進為「多市場即時報價、法人籌碼穿透、宏觀戰情室與外部 API 深度整合」之綜合金融終端，系統在客戶端 (Client-side) 面臨三大嚴峻的資訊安全與隱私洩漏隱患：

### 1. 儲存端 (At-Rest)：明文金鑰暴露與 XSS / 實體窺探風險 (Debt #0030)
- **現狀**：使用者在設定工作區填寫的付費金融 API 憑證（例如 `FinMind Token`、`FMP API Key`、`AlphaVantage Key` 或私人代理伺服器 URL），目前在 `localStorage` 與 `IndexedDB` 中均以**毫無防護的純明文 JSON** 存放。
- **痛點**：
  - 任何同源 XSS 注入或惡意第三方腳本，只需調用 `localStorage.getItem()` 即可在 1 毫秒內竊取使用者的所有 API 額度與私有權杖。
  - 在共用電腦、展示環境或家庭環境下，任何人員開啟瀏覽器 DevTools 即可肉眼直視使用者的真實金鑰。

### 2. 傳輸端 (In-Transit)：公共 CORS 代理中間人竊聽與憑證洩漏 (Debt #0031)
- **現狀**：當前端瀏覽器因同源政策 (SOP) 限制無法直連外部數據源時，系統配置了公共第三方 CORS 代理池（`corsproxy.io`、`allorigins.win`、`codetabs.com`）。
- **痛點**：
  - 若未來 API 請求帶有 `token=xyz`、`apikey=abc` 或 `Authorization` 標頭，透過公共代理轉發將導致使用者付費憑證被第三方伺服器的 Access Log 永久記錄，甚至遭遇中間人 (MITM) 竊聽與偽造數據。
  - 自訂 Proxy URL 輸入框缺乏嚴格的協定校驗與 SSRF 阻斷機制，存在被誘騙設定為惡意內網端點之風險。

### 3. 資料進出端 (In/Out)：CSV 公式注入 (DDE) 與備份外流 (Debt #0032)
- **現狀**：系統提供交易紀錄 CSV 匯出與全庫 JSON 備份功能。
- **痛點**：
  - 當使用者備註、股票名稱或標籤包含以 `=`, `+`, `-`, `@`, `\t`, `\r` 開頭的惡意文字時，匯出的 CSV 檔案在 Excel / LibreOffice 開啟時會被試算表軟體解譯為動態資料交換 (DDE) 公式執行，觸發本機代碼執行 (RCE)。
  - 匯出全庫 JSON 備份時，未提供脫敏機制，導致 API 金鑰與敏感連線資訊伴隨交易明細一同匯出，增加分享備份檔時金鑰外洩的機率。

---

## 二、解決方案 (Solution)

建構一套具備縱深防禦 (Defense-in-Depth) 的**「客戶端全鏈路金融資安與防禦加固矩陣」**，由底層密碼學、網路路由邊界至資料匯出層層阻斷：

```mermaid
flowchart TD
    subgraph 1. 儲存層加密 (At-Rest Defense)
        UserPass[使用者主密碼 / 裝置金鑰] --> PBKDF2[PBKDF2 100,000 次疊代衍生]
        PBKDF2 --> AES[AES-GCM 256-bit authenticated encryption]
        PlainKeys[明文 API 金鑰配置] --> AES
        AES --> EncryptedPayload[密文封裝 Payload (IV + Salt + Ciphertext)]
        EncryptedPayload --> SecureStorage[(IndexedDB / LocalStorage 密文存儲)]
    end

    subgraph 2. 網路傳輸安全閘門 (In-Transit Defense)
        OutReq[外部 API HTTP 請求] --> RouteGuard{檢測是否包含敏感憑證?}
        RouteGuard -->|含 token/apikey/auth| DirectOnly[嚴格限制：僅限本地 Vite/私人 HTTPS 代理/官方直連]
        RouteGuard -->|純公開無憑證數據| PublicCORS[允許公共 CORS 代理池降級]
        DirectOnly -.->|硬性阻斷| BlockCORS[❌ 絕對禁止流向 corsproxy/allorigins]
        CustomProxy[自訂 Proxy URL 檢核] --> SSRFGuard[阻斷非 HTTPS、localhost、私有內網 IP]
    end

    subgraph 3. 資料匯出脫敏與公式防禦 (Data Export Defense)
        RawExport[匯出交易或備份] --> CsvSanitizer[OWASP CSV 儲存格消毒轉義 (前置單引號)]
        RawExport --> Redactor[JSON 備份脫敏開關 (自動抹除 API 金鑰)]
        CsvSanitizer --> SafeCSV[安全 CSV (阻斷 Excel DDE 執行)]
        Redactor --> SafeJSON[脫敏備份 JSON]
    end
```

---

## 三、使用者故事 (User Stories)

### 模組 A：Web Crypto 敏感金鑰加密與持久化 (Debt #0030)
1. **作為**一位高度重視帳戶安全的台美股投資人，**我想要**在設定中將我的 FinMind Token 與 FMP 金鑰加密儲存，**以便於**即便他人使用我的瀏覽器開啟 DevTools，也無法直接看見我的明文金鑰。
2. **作為**一位使用者，**我想要**能設定一組個人主解鎖密碼 (Master Passphrase)，**以便於**利用密碼學演算法保護我的所有敏感 API 配置。
3. **作為**一位追求流暢體驗的使用者，**我想要**在不設定主密碼時，系統能自動使用本機安全隨機種子進行透明保護，**以便於**兼顧安全與免重複輸入密碼的便利性。
4. **作為**一位在公用螢幕操作的交易員，**我想要**設定工作區的 API 金鑰輸入框預設顯示為遮罩狀態（如 `sk-fmp****8a2f`），**以便於**防止旁人窺視 (Shoulder Surfing)。
5. **作為**一位既有專案使用者，**我想要**系統在升級到此版本時，自動將既有的舊版明文金鑰無損原地升級為密文封裝，**以便於**我的現有 API 設定不遺失。
6. **作為**一位使用者，**當我**輸入錯誤的主解鎖密碼時，系統應當給出清晰的錯誤警告並阻止解密，**以便於**防止惡意窮舉攻擊。

### 模組 B：公共 CORS 代理零憑證防洩漏與安全邊界路由 (Debt #0031)
7. **作為**一位金融 API 訂閱用戶，**我想要**在發送帶有憑證的 API 請求時，系統絕對不透過公共第三方代理轉發，**以便於**我的私有 Token 不會被公共代理伺服器記錄日誌。
8. **作為**一位系統架構師，**我想要**網路中介層在偵測到 URL 包含 `token=`, `apikey=`, `api_key=`, `secret=` 等參數時強制走安全路由，**以便於**從物理架構上杜絕洩漏。
9. **作為**一位使用者，**當我**在設定中填寫自訂 Proxy 伺服器網址時，若誤填了 `http://` 明文協定或 `http://localhost`、`192.168.1.1` 內網位址，系統應當即時阻擋並提示，**以便於**防範中間人竊聽與 SSRF 內網探測攻擊。
10. **作為**一位投資人，**當我**請求純公開的無憑證即時報價（如 Yahoo 財務公開行情）時，系統依然能安全使用公共代理降級重試，**以便於**在網路受限時維持報價可用性。

### 模組 C：CSV 公式注入 (DDE) 防禦與 JSON 備份脫敏 (Debt #0032)
11. **作為**一位常常將記帳紀錄分享給社群或會計師的使用者，**我想要**匯出的 CSV 檔案在 Excel 開啟時絕對不會被觸發執行惡意指令，**以便於**保障收件人的電腦安全。
12. **作為**一位資安管理員，**我想要**所有以 `=`, `+`, `-`, `@`, `\t`, `\r` 開頭的字串欄位在匯出 CSV 時被自動轉義，**以便於**阻斷任何形式的動態資料交換 (DDE) 漏洞利用。
13. **作為**一位需要向開發團隊回報 Bug 的使用者，**我想要**在匯出全庫 JSON 備份時，能一鍵勾選「脫敏匯出」，**以便於**自動將 API 金鑰和敏感身分資訊剔除，放心地提供資料檔案。
14. **作為**一位進行資料還原的使用者，**當我**匯入包含惡意公式字串的外部 CSV 時，系統能安全解析並中和危險語法，**以便於**主系統資料庫不受污染。

---

## 四、實作決策 (Implementation Decisions)

### 1. 密碼學標準與資料格式 (Cryptography Architecture)
- **加密核心**：採用標準 W3C **Web Crypto API (`window.crypto.subtle`)**，純原生 0 外部依賴。
- **演算法規範**：
  - **對稱加密**：`AES-GCM` 256-bit。
  - **密鑰衍生**：`PBKDF2` 搭配 `HMAC-SHA-256`，疊代次數為 100,000 次（符合 NIST SP 800-132 標準）。
  - **初始化向量 (IV)**：每次加密獨立生成密碼學安全之 12-byte (96-bit) 隨機 IV。
  - **鹽值 (Salt)**：每次金鑰衍生獨立生成 16-byte (128-bit) 隨機 Salt。
- **密文封裝結構 (`EncryptedPayload`)**：
  ```typescript
  export interface EncryptedPayload {
    version: 1;             // 密碼學版本號
    algorithm: 'AES-GCM';   // 加密演算法
    salt: string;           // Base64 編碼的 16-byte Salt
    iv: string;             // Base64 編碼的 12-byte IV
    ciphertext: string;     // Base64 編碼的密文 (含 128-bit GCM Auth Tag)
  }
  ```

### 2. 網路邊界與零憑證外發閘門 (Zero-Credential Routing Guard)
- **敏感字詞識別字典**：
  涵蓋 Query 參數與 Header 欄位特徵：`['token', 'apikey', 'api_key', 'key', 'secret', 'authorization', 'bearer']`。
- **路由分流決策規則**：
  1. 若請求 URL 或配置帶有上述敏感字詞：
     - **優先 1**：官方直連 (Direct Fetch)。
     - **優先 2**：本地開發 Vite 代理 (`/api/...`)。
     - **優先 3**：使用者明確配置的受信任 HTTPS 自訂代理。
     - **❌ 絕對禁行**：公共代理池 (`corsproxy.io`, `allorigins.win`, `codetabs.com`)。一旦偵測試圖外發，直接拋出 `SecurityCredentialRoutingError` 終止請求。
  2. 若請求為純公開、不帶憑證之 URL（如 Yahoo Finance 無 token 查詢）：
     - 允許在直連失敗時依序降級至公共 CORS 代理池。
- **自訂 Proxy SSRF 白名單防禦**：
  - 協定必須為 `https:`（開發環境允許特定 localhost 測試）。
  - 主機名稱禁止為私有 IPv4 保留段（`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`）及雲端中繼資料位址（`169.254.169.254`）。

### 3. OWASP CSV DDE 消毒與脫敏機制 (CSV Sanitization & Redaction)
- **危險字元黑名單**：
  `['=', '+', '-', '@', '\t', '\r']`。
- **消毒處理原則 (OWASP CSV Injection Standard)**：
  - 若欄位為字串且開頭為上述危險字元，一律在前方附加單引號 `'`（例如：`=cmd|' /C calc'!A0` ➔ `"'=cmd|' /C calc'!A0"`）。
  - 數值型別（如價格、股數、費用）保持純數值，不進行字串轉義，維持 Excel 試算表統計功能正常。
- **備份脫敏邏輯**：
  - 匯出全庫 JSON 時，設定物件 `settings.apiKeys` 中的所有敏感字串欄位（如 `finmindToken`, `fmpApiKey`, `alphaVantageKey`）替換為空字串 `""`，並將 `isRedacted: true` 標籤注入備份元數據。

---

## 五、測試縫隙與驗收決策 (Testing Decisions)

本功能嚴格遵循公開介面縫隙 (Test Seams) 進行測試，不測試私有閉包細節：

### 縫隙 1：密碼學引擎 (`src/engine/cryptoEngine.test.ts`)
- **測試重點**：
  - 測試使用相同密碼加密與解密能精準還原原始物件。
  - 測試使用錯誤密碼解密時拋出解密失敗異常，杜絕垃圾資料外洩。
  - 測試連續兩次加密同一物件，其 Salt、IV 與密文必須因隨機熵而不相同。
  - 測試在非 Secure Context 下的優雅降級與安全警示。

### 縫隙 2：安全網路路由閘門 (`src/engine/secureProxyRouter.test.ts`)
- **測試重點**：
  - 傳入帶有 `token=xyz` 或 `apikey=abc` 之 URL 時，斷言公共 CORS 代理被 100% 排除，禁止任何外發。
  - 傳入純公開 URL 時，確認公共代理鏈路依然能正常執行 fallback。
  - 傳入非法協定（`http://`, `javascript:`, `ftp://`）或 SSRF 內網 IP 時，斷言阻斷校驗。

### 縫隙 3：CSV 消毒與備份脫敏 (`src/engine/csvSanitizer.test.ts`)
- **測試重點**：
  - 針對 6 種危險開頭字元（`=`, `+`, `-`, `@`, `\t`, `\r`）驗證 CSV 輸出是否 100% 被轉義前置 `'`。
  - 一般文字與合法負數金額不被破壞。
  - 測試 JSON 備份脫敏器能精確抹除金鑰，同時保留交易與資產帳本完整性。

---

## 六、範圍外排除 (Out of Scope)

1. **硬體安全模組 (HSM / YubiKey)**：本期不實作 WebAuthn 實體安全金鑰驗證，以純軟體 Web Crypto API 為核心。
2. **多租戶後端資料庫加密**：本專案為 Local-First 客戶端單頁應用，不涉及雲端關聯式資料庫 (PostgreSQL/MySQL) 的伺服器端加密 (TDE)。
3. **動態跨域代理伺服器架設**：不包含由專案自行託管雲端 Proxy 伺服器，專注於客戶端安全路由防護。
