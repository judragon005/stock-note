# 規格書 0157: 金融級前端縱深防禦與離線主權架構規格書 (Client-Side Defense-in-Depth & Offline Sovereignty Spec)

- **狀態**：`READY_FOR_TRIAGE`
- **所屬版本**：`v8.70.0`
- **建立日期**：2026-10-02
- **對齊技術債**：
  - 👑 **核心最重要**：[Debt #0033: 內容安全策略 (CSP) 與瀏覽器端防禦加固](../debts/0033-csp-headers-and-browser-defense-hardening.md) (`P1`)
  - 🔗 **高度關聯一**：[Debt #0034: 匯入解析防護、原型污染防禦與數值邊界熔斷](../debts/0034-import-parser-prototype-pollution-and-schema-validation.md) (`P2`)
  - 🔗 **高度關聯二**：[Debt #0023: 離線優先 PWA 與 E2EE 零知識端對端加密雲端同步](../debts/0023-pwa-offline-first-and-e2ee-cloud-sync.md) (`P3`)

---

## 1. 脈絡與背景 (Context & Problem Statement)

本系統為一款純前端、無伺服器、以本機 IndexedDB 為核心儲存的「台美雙市場股票交易紀錄與量化戰情室」。隨著系統演進至多市場即時報價、法人籌碼穿透、宏觀戰情室與 AI 主力決策儀表板，應用程式所持有之資產數據、真實持倉、損益與金融 API 金鑰具備極高隱私與財務價值。

在先前的資安演進中（ADR 0116），系統已完成靜態儲存加密（Debt #0030）、CORS 代理憑證防洩漏（Debt #0031）與 CSV DDE 公式注入防禦（Debt #0032）。然而，在前端防護體系中，仍存在三大邊界盲區（對應專案目前僅存的最後 3 個 OPEN 技術債）：

1. **網路與腳本外邊界缺乏限制 (Debt #0033, P1)**：
   - `index.html` 缺乏 CSP Meta 標籤，`vite.config.ts` 缺乏安全 HTTP 標頭。
   - 一旦發生 XSS 或引入惡意依賴，攻擊者可藉由未受限的 `connect-src` 將全庫資產明文透過 `fetch()` 外洩至任意未受控伺服器，或在惡意網站以 `<iframe>` 實施點擊劫持 (Clickjacking)。
2. **資料輸入邊界缺乏原型污染與數值熔斷防禦 (Debt #0034, P2)**：
   - 全庫備份還原 (`importFullDatabaseJSON`) 直接執行 `JSON.parse` 後入庫，未做原型鍵名過濾；
   - 交易驗證器 `validateTradesSchema` 允許 `Infinity`、負數價格/股數，且備忘字串無長度上限，易遭受 DoS 記憶體耗盡或破壞會計計算引擎（如 XIRR 死迴圈）。
3. **缺乏獨立桌面/行動端安裝體驗與零知識 E2EE 備份 (Debt #0023, P3)**：
   - 專案缺乏 Web App Manifest 與 Service Worker 快取，無網路時無法秒開；
   - 跨裝置備份依賴手動傳輸明文 JSON 檔案，缺乏基於 Web Crypto 之零知識主密碼端對端加密封包。

本規格書旨在整合上述三項技術債，打造一套兼具**外層防線 (CSP/Headers)**、**輸入防線 (Proto/Schema Guard)** 與**韌性主權防線 (PWA/E2EE)** 之金融級縱深防禦架構，並一次性使全專案技術債全面清零。

---

## 2. 系統架構與防禦模型 (Defense-in-Depth Architecture)

```
                            ┌────────────────────────────────────────┐
                            │    外部威脅 / 惡意網站 / 網路連線竊聽   │
                            └───────────────────┬────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ 模組一：外邊界 CSP 與安全標頭 (Debt #0033)                                               │
│ ├─ index.html CSP Meta: default-src 'self', script-src 'self', connect-src 白名單鎖定      │
│ └─ vite.config.ts Headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff           │
└───────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧼 模組二：輸入邊界原型防禦與邊界熔斷 (Debt #0034)                                          │
│ ├─ safeSanitizeObject: 遞迴剝除 __proto__, constructor, prototype                           │
│ ├─ sanitizeTradeRecord: 數值邊界熔斷 (0 < shares <= 1e9, 0 <= price <= 1e7, note <= 2000字) │
│ └─ validateFullDatabaseBackup: 全庫 JSON 備份檔反序列化前置深層安全查驗                      │
└───────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📦 模組三 & 四：PWA 離線秒開與 E2EE 零知識備份 (Debt #0023)                                 │
│ ├─ manifest.json + service-worker.js: 靜態 Bundle 快取、獨立視窗 standalone 模式           │
│ └─ e2eeBackupEngine.ts: AES-GCM-256 + PBKDF2 主密碼端對端加密還原鏈 (.e2ee.json)            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 功能規格與技術細節 (Detailed Specifications)

### 模組一：內容安全策略 (CSP) 與瀏覽器端防禦加固 (Debt #0033)

#### 1.1 `index.html` 生產級 CSP Meta 標籤
在 `<head>` 中注入嚴格之 CSP 規則：
```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: https: blob:;
    connect-src 'self'
      https://query1.finance.yahoo.com
      https://openapi.twse.com.tw
      https://www.twse.com.tw
      https://www.tpex.org.tw
      https://api.finmindtrade.com
      https://financialmodelingprep.com
      https://www.alphavantage.co
      https://corsproxy.io
      https://api.allorigins.win
      https://api.codetabs.com
      ws://localhost:*
      ws://127.0.0.1:*;
    worker-src 'self' blob:;
    manifest-src 'self';
    base-uri 'self';
    form-action 'self';
  "
/>
```

#### 1.2 `vite.config.ts` 開發與預覽環境 HTTP 安全標頭
在 `server.headers` 與 `preview.headers` 中注入：
- `X-Frame-Options`: `DENY`（徹底阻斷所有透明 `<iframe>` 點擊劫持）
- `X-Content-Type-Options`: `nosniff`（禁止 MIME-sniffing）
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Content-Security-Policy`: 包含 `frame-ancestors 'none';`

---

### 模組二：輸入邊界原型污染防禦與數值邊界熔斷 (Debt #0034)

#### 2.1 原生零依賴安全反序列化器 (`securitySanitizer.ts`)
- **`safeSanitizeObject<T>(obj: T): T`**：
  - 遞迴遍歷物件與陣列。
  - 當遇到鍵名為 `__proto__`、`constructor`、`prototype` 時直接略過拋棄，防止竄改全域原型鏈。
  - 產生物件均以 `Object.create(null)` 為字典底層或純乾淨 Object，確保無外部屬性繼承。

#### 2.2 交易記錄與數值邊界熔斷守護 (`sanitizeTradeRecord`)
每一筆匯入記錄落地前強制執行合法性校驗：
- `shares`: 必須為有限正數 (`Number.isFinite(s) && s > 0 && s <= 1e9`)。
- `price`: 必須為有限非負數 (`Number.isFinite(p) && p >= 0 && p <= 1e7`)。
- `fee`, `tax`: 必須為有限非負數 (`Number.isFinite(n) && n >= 0 && n <= 1e8`)。
- `symbol`: 必須為 1~12 字元之英數字與特定符號 (`/^[A-Za-z0-9.-]{1,12}$/`)。
- `note`: 字串強制截斷至 2,000 字元以內。
- `tags`: 單筆交易標籤最多 20 個，每個標籤長度最多 50 字元。

#### 2.3 全庫 JSON 備份檔反序列化前置安全審核 (`validateFullDatabaseBackup`)
在 `importFullDatabaseJSON` 執行前：
1. 透過 `safeSanitizeObject` 徹底清洗 JSON 物件。
2. 驗證資料庫頂層結構包含有效之 `data` 物件與合法版本標記。
3. 對 `trades`、`brokerAccounts`、`cashTransactions`、`loanRecords` 進行逐筆過濾，剔除不合規或惡意污染之資料行。

---

### 模組三：離線優先 PWA 與 Service Worker (Debt #0023 Part 1)

#### 3.1 Web App Manifest (`public/manifest.json`)
```json
{
  "short_name": "股票分析儀",
  "name": "股票交易紀錄與分析儀 | 繁中雙市場版",
  "icons": [
    {
      "src": "/favicon.svg",
      "type": "image/svg+xml",
      "sizes": "192x192 512x512"
    }
  ],
  "start_url": "/",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

#### 3.2 原生 Service Worker (`public/sw.js`)
- 採用極簡高效的 `Stale-While-Revalidate` 策略：
  - 快取靜態資源（HTML, JS, CSS, Google Fonts, SVG 圖示）。
  - 對外部 API 請求採 `Network-First`，若離線則安全降級，不干擾報價快取系統。
- `src/main.tsx` 於生產環境或已註冊瀏覽器中非同步啟動 `navigator.serviceWorker.register('/sw.js')`。

---

### 模組四：E2EE 零知識主密碼端對端加密備份 (Debt #0023 Part 2)

#### 4.1 E2EE 封包結構 (`E2EEBackupPayload`)
```typescript
export interface E2EEBackupPayload {
  format: 'STOCK_TRACKER_E2EE_BACKUP';
  version: 1;
  createdAt: string;
  crypto: {
    algorithm: 'AES-GCM';
    keyDerivation: 'PBKDF2';
    iterations: 100000;
    salt: string; // Base64
    iv: string;   // Base64
  };
  ciphertext: string; // Base64
}
```

#### 4.2 零知識加密與還原管線 (`e2eeBackupEngine.ts`)
- **匯出**：
  1. 使用者於設定面板輸入自訂主密碼 (Passphrase)。
  2. 提取目前資料庫全量快照 JSON 字串。
  3. 呼叫 `encryptPayload<string>(jsonStr, passphrase)` 產出 AES-GCM-256 密文。
  4. 下載為 `.e2ee.json` 加密檔案。
- **還原**：
  1. 使用者上傳 `.e2ee.json` 檔案並輸入主密碼。
  2. 驗證密文簽署完整性；若密碼錯誤則拋出標準 `DecryptionFailedError` 並安全終止。
  3. 解密後經由 `validateFullDatabaseBackup` 進行輸入清洗，再寫入 IndexedDB。

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1 (CSP 生效)**：`index.html` 與 Vite 伺服器啟動時，CSP 標籤與安全 Header 正確生效，Google Fonts、Yahoo 行情、TWSE/TPEx 官方 API 與 Vite HMR 均能正常通信。
- [ ] **AC-2 (CSP 阻斷檢測)**：在瀏覽器嘗試對非白名單外部位址（如 `https://untrusted-exfil.com`）發起 `fetch` 時，DevTools 控制台精準觸發 CSP 連線阻斷警告。
- [ ] **AC-3 (防點擊劫持)**：使用第三方網頁以 `<iframe>` 嵌入本應用程式時，被 `X-Frame-Options: DENY` 與 `frame-ancestors 'none'` 徹底拒絕渲染。
- [ ] **AC-4 (原型污染阻斷)**：當匯入含有 `{"__proto__": {"isAdmin": true}}` 或 `{"constructor": {"prototype": {"polluted": true}}}` 之惡意 JSON 時，全域 `Object.prototype` 維持純淨不受污染。
- [ ] **AC-5 (數值邊界熔斷)**：匯入含有 `shares: Infinity`、`shares: -100` 或長達 50,000 字元之 Note 時，驗證器正確截斷或略過該無效紀錄，會計計算引擎與 XIRR 維持正常運作。
- [ ] **AC-6 (PWA 獨立安裝)**：提供符合 PWA 規範之 `manifest.json` 與 Service Worker，支援瀏覽器「安裝為應用程式」按鈕。
- [ ] **AC-7 (E2EE 零知識加解密)**：
  - 使用者能以主密碼將全庫導出為 `.e2ee.json` 密文檔；
  - 密文檔中不含任何可讀之交易明文；
  - 輸入正確密碼可 100% 完整還原全庫；輸入錯誤密碼提示明確失敗且不污染資料庫。
- [ ] **AC-8 (回歸保證)**：專案全量測試套件維持 100% 綠燈，建置（`npm run build`）0 錯誤。
- [ ] **AC-9 (技術債清零)**：`docs/debts/README.md` 中 Debt #0033、#0034、#0023 全數標註為 `RESOLVED`。

---

## 5. 測試縫隙 (Test Seams)

1. `src/engine/securitySanitizer.test.ts`：針對原型污染向量、數值邊界熔斷、惡意字串 DoS 進行邊界測試。
2. `src/engine/cspSecurity.test.ts`：針對 CSP 策略字串、白名單合規性與外連判定進行單元測試。
3. `src/engine/e2eeBackupEngine.test.ts`：針對 E2EE 加密封包生成、錯誤密碼拒絕、正確密碼解密還原進行單元測試。
4. `src/utils/db.test.ts`：擴充測試 `importFullDatabaseJSON` 結合 `validateFullDatabaseBackup` 之端到端還原防護。

---

## 6. 關聯文檔與追蹤

- 技術債：
  - [Debt #0033](../debts/0033-csp-headers-and-browser-defense-hardening.md)
  - [Debt #0034](../debts/0034-import-parser-prototype-pollution-and-schema-validation.md)
  - [Debt #0023](../debts/0023-pwa-offline-first-and-e2ee-cloud-sync.md)
- 架構決策記錄：預計產出 `docs/adr/0157-client-side-defense-in-depth-and-offline-sovereignty.md`
- 變更日誌：預計於交接階段同步更新 `CHANGELOG.md` 與 `CONTEXT.md`
