# 技術債 #0023: 離線優先 PWA 與 E2EE 零知識端對端加密雲端同步 (PWA Offline-First & E2EE Cloud Sync)

- **狀態**：`OPEN`
- **優先級**：`P3`
- **發現來源**：/grill-with-docs 跨裝置離線應用與零知識隱私同步需求調研
- **建立日期**：2026-09-02
- **標籤**：`Architecture` · `PWA` · `E2EE` · `Storage` · `Security` · `Sync` · `Mobile`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統具備強大的純前端無伺服器架構與 IndexedDB 儲存引擎（[src/db/stockTrackerDB.ts](file:///d:/APP/股票紀錄/src/db/stockTrackerDB.ts)）：
1. **單一瀏覽器本機隔離限制**：
   - 目前所有持倉、交易紀錄、現金帳本與快照均儲存於單一瀏覽器的 IndexedDB 中。
   - 若使用者在不同裝置間切換（例如：桌面電腦記帳、外出使用手機或 iPad 查閱行情與損益），必須透過「時光機快照 JSON 匯出 ➔ 手動傳送檔案 ➔ 另一裝置匯入」，體驗破碎且易因覆寫導致版本分歧。
2. **缺乏原生 App 般之離線安裝體驗**：
   - 專案尚未配置 Web App Manifest 與 Service Worker 快取，使用者無法一鍵「安裝至主畫面 / 安裝為桌面獨立應用 (PWA)」，亦無法在無網路環境下直接秒開整站靜態資源。
3. **隱私至上原則下的雲端同步挑戰**：
   - 專案遵循《金鑰與隱私零外洩》核心準則，嚴禁將個人財務資產數據以明文上傳至未受控的公開後端。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

### 問題分析 (Problem Analysis)
1. **零知識證明 (Zero-Knowledge) 端對端加密 (E2EE) 架構**：
   - 同步至任何第三方雲端（Google Drive、WebDAV、GitHub Gist、Dropbox 或自建 S3 相容儲存）前，必須在瀏覽器端使用 **Web Crypto API (AES-GCM-256 + PBKDF2 / Argon2id 密鑰衍生)** 進行客戶端強制加密。
   - 雲端儲存伺服器僅儲存密文 Blob，無使用者主密碼絕對無法解密，兼顧跨裝置同步與 100% 絕對隱私。
2. **差異比對與衝突解決 (CRDT / Timestamp Vector Clock)**：
   - 多裝置同時離線記帳時，需有時間戳版本機制，避免舊資料覆蓋新紀錄。
3. **PWA 離線靜態資源快取與自動更新機制**：
   - 採用 Workbox 或原生 Service Worker 實作 `Stale-While-Revalidate` 策略，兼顧版本無縫熱更新與離線秒開。

### 暫緩理由 (Deferral Rationale)
1. 現有 IndexedDB 時光機快照與全量 JSON 備份已能保障單機資料安全與防呆回滾。
2. PWA 與 E2EE 涉及 Web Crypto API、Service Worker 生命週期與雲端儲存授權協議，適合作為獨立架構升級專案進行推進。

---

## 3. 建議重構與功能規格方案 (Proposed Specification & Architecture)

### A. PWA 配置與 Service Worker

- **Web App Manifest (`public/manifest.json`)**：
  - 定義應用名稱、高解析度圖示 (192x192, 512x512)、主題色 (`theme_color`)、啟動模式 (`standalone`)。
- **Service Worker 快取策略**：
  - **靜態資源 (HTML/JS/CSS/Fonts)**：Cache-First / Stale-While-Revalidate。
  - **外部 API (Yahoo / TWSE 行情)**：Network-First + 本地 Fallback 快取保底。

### B. E2EE 零知識加密同步協議 (Zero-Knowledge E2EE Protocol)

```
[使用者輸入主密碼 (Passphrase)]
       │
       ▼ (PBKDF2 / SHA-256 + 100,000 次疊代 + 本地 Salt)
[256-bit AES-GCM 對稱密鑰]
       │
       ▼ (客戶端瀏覽器全量資料庫 JSON 序列化)
[AES-GCM-256 加密 ➔ 產生 Ciphertext + IV + AuthTag]
       │
       ▼ (OAuth 2.0 / WebDAV API)
[同步上傳至 Google Drive AppData / 個人 WebDAV / GitHub Gist]
```

### C. 雲端同步介面與連線適配器 (Cloud Sync Adapters)

```typescript
export interface CloudSyncProvider {
  id: 'google-drive' | 'webdav' | 'github-gist';
  name: string;
  connect(): Promise<boolean>;
  uploadEncryptedPayload(encryptedBlob: ArrayBuffer, meta: SyncMetadata): Promise<boolean>;
  downloadEncryptedPayload(): Promise<{ encryptedBlob: ArrayBuffer; meta: SyncMetadata } | null>;
  getLastSyncTimestamp(): Promise<number>;
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者提出「手機/平板與電腦跨裝置無縫同步」之需求時。
2. 規劃系統「離線 PWA 桌面/手機安裝化」改造時。
3. 整合第三方雲端備份（Google Drive / WebDAV）設定面板時。
