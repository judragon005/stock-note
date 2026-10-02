# ADR 0157: 金融級前端縱深防禦、CSP 加固、原型防禦與 PWA/E2EE 離線主權體系

## 狀態
已通過 (Accepted) - 2026-10-02

## 脈絡與背景 (Context)
本專案為純前端無伺服器、以本機 IndexedDB 為核心儲存的金融投資分析儀與量化戰情室。隨著系統整合多市場即時報價、法人籌碼穿透、宏觀流動性與 AI 主力決策儀表板，應用程式所持有之資產數據、真實持倉、損益與金融 API 權杖具備極高財務隱私價值。

在系統過往的演進中，尚有三大資安與應用架構技術債待清理（也是專案僅存的最後 3 個 OPEN 技術債）：
1. **外邊界未受控 (Debt #0033, P1)**：缺乏 CSP 與安全 HTTP 標頭，缺乏對外部連線外發 (Exfiltration) 與點擊劫持 (Clickjacking) 的硬性防禦。
2. **輸入邊界未熔斷 (Debt #0034, P2)**：全庫 JSON 備份還原直接 `JSON.parse` 入庫，易受原型污染攻擊 (`__proto__`, `constructor`)；數值允許 `Infinity` 或超長字串引發 DoS 或 XIRR 死迴圈。
3. **離線與跨裝置主權不足 (Debt #0023, P3)**：缺乏 PWA Manifest 與 Service Worker 離線快取；跨裝置備份仍依賴明文檔案，缺乏零知識端對端加密 (E2EE)。

## 決策細節 (Decision Details)

### 1. 外邊界內容安全策略 (CSP) 與安全標頭加固
- **雙軌防禦部署**：
  - `index.html`：注入 `<meta http-equiv="Content-Security-Policy">`，鎖定 `default-src 'self'`, `script-src 'self' 'unsafe-eval'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com data:`, 以及精準白名單限制之金融 API 與 Vite HMR 連線。
  - `vite.config.ts`：在 `server.headers` 與 `preview.headers` 中注入 `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, 以及含 `frame-ancestors 'none'` 之 CSP。
- **純函式驗證核心 (`src/engine/cspSecurity.ts`)**：提供 `generateCspMetaContent()`, `generateCspHeaderValue()` 與 `isAllowedConnectUrl()`，對外連進行合規性檢驗。

### 2. 輸入邊界原型污染防禦與數值熔斷守門員
- **原生安全反序列化 (`safeSanitizeObject<T>`)**：
  - 遞迴遍歷並徹底剝除 `__proto__`, `constructor`, `prototype` 保留鍵名。
  - 產生物件底層使用 `Object.create(null)`，確保全域原型鏈不可被竄改。
- **數值邊界硬性熔斷 (`sanitizeTradeRecord`)**：
  - `shares`: 有限正數 (`0 < s <= 1e9`)，阻斷 `Infinity`, `NaN` 與負數。
  - `price`: 有限非負數 (`0 <= p <= 1e7`)。
  - `fee`, `tax`: 有限非負數 (`0 <= n <= 1e8`)。
  - `note`: 強制截斷至 2,000 字元以內，防範 DoS 記憶體炸彈。
  - `tags`: 上限最多 20 個標籤，每個標籤截斷至 50 字元以內。
- **全庫備份匯入守門員 (`validateFullDatabaseBackup`)**：
  - 在 `src/utils/db.ts` 之 `importFullDatabaseJSON` 前置執行深層清洗，惡意載荷無法直接寫入 IndexedDB。

### 3. PWA 獨立視窗與原生 Service Worker 離線秒開
- **Web App Manifest (`public/manifest.json`)**：
  - 配置 `display: "standalone"`, `theme_color: "#0f172a"`, `background_color: "#0f172a"`，提供無網址列之桌面與手機原生應用體驗。
- **原生輕量 Service Worker (`public/sw.js`)**：
  - 靜態資源（HTML, JS, CSS, Google Fonts, SVG 圖示）採 `Stale-While-Revalidate` 策略，達成離線秒開。
  - 外部金融 API 採 `Network-First`，離線時不破壞前端原有報價中繼快取。

### 4. E2EE 零知識主密碼端對端加密備份閉環
- **加密核心 (`src/engine/e2eeBackupEngine.ts`)**：
  - 封裝格式為 `STOCK_TRACKER_E2EE_BACKUP` (v1)。
  - 利用原生 Web Crypto API，以 `AES-GCM-256` 搭配 `PBKDF2 100,000` 次疊代（16-byte 隨機 Salt，12-byte 隨機 IV）進行全庫加密。
  - 密文檔中絕不含任何可讀之交易或持倉明文。
- **解密與驗證 (`decryptE2EEBackup`)**：
  - 主密碼錯誤或密文遭竄改時拋出明確解密失敗並安全阻斷，解密成功後傳遞至安全性校驗器無損還原。
- **設定工作區 UI 整合 (`SettingsWorkspace.tsx`)**：
  - 新增「🔒 E2EE 加密備份」下載按鈕與主密碼設定彈窗；
  - 支援上傳 `.e2ee.json` 檔案並自動彈出密碼輸入框解密還原。

## 影響評估 (Consequences)
- **正面效益**：
  - 前端資安防線達成金融級縱深防禦，阻斷 XSS 數據外洩、原型污染、點擊劫持與畸形數值 DoS。
  - 獲得 PWA 獨立視窗安裝與離線秒開能力，大幅提升行動端與桌面體驗。
  - 透過 E2EE 零知識加密，使用者可安全使用任何公共雲端或通訊軟體跨裝置同步個人資產。
  - **專案技術債看板 40 個項目正式達成 100% 清零 (All RESOLVED)**。
- **折衷與限制**：
  - CSP 嚴格限制外連網址，若未來新增第三方外部 API 服務，必須同步更新 `cspSecurity.ts` 與 `index.html` 白名單。

## 關聯項目
- 規格書：[0157-client-side-defense-in-depth-and-offline-sovereignty-spec.md](../specs/0157-client-side-defense-in-depth-and-offline-sovereignty-spec.md)
- GitHub Issue：[#142](https://github.com/judragon005/stock-note/issues/142)
- 關聯技術債：`Debt #0033`, `Debt #0034`, `Debt #0023` (全數切換為 RESOLVED)
