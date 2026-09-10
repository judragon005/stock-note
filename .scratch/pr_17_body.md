## 概述 (Overview)

本 PR 完整實作 **PRD #0116** 所定義之客戶端全鏈路資訊安全防禦矩陣，徹底解決技術債 **Debt #0030**、**Debt #0031** 與 **Debt #0032**：
1. **Web Crypto 敏感金鑰加密與持久化 (Debt #0030)**：使用原生 W3C `window.crypto.subtle` (AES-GCM 256-bit + PBKDF2 100,000 次疊代) 加密存儲使用者 API 金鑰，支援原地自動遷移 (Auto-Migration) 與防窺遮罩 UI。
2. **公共 CORS 代理零憑證防洩漏與安全邊界路由 (Debt #0031)**：實作 `secureProxyRouter` 路由中介層，偵測敏感憑證參數（token/apikey/auth）並 100% 阻斷外發至公共 CORS 代理池；同時對自訂 Proxy 進行 HTTPS 校驗與私有內網/雲端 Metadata SSRF 阻斷。
3. **CSV DDE 公式注入防禦與備份脫敏 (Debt #0032)**：實作符合 OWASP 標準之儲存格消毒過濾器（前置單引號 `'` 中和 `=, +, -, @, \t, \r` 危險字元），並提供全庫 JSON 備份脫敏匯出功能。

Closes #17

---

## 核心測試縫隙與驗證 (Test Seams & Verification)

本 PR 新增 24 個公開介面縫隙單元測試，總測試數達 **736/736 100% 通過**，TypeScript strict 0 錯誤：
- **縫隙 1：密碼學引擎 (`src/engine/cryptoEngine.test.ts`)**
  - AES-GCM 256-bit 加解密與 PBKDF2 (100,000 次) 金鑰衍生
  - 隨機熵驗證：連續兩次加密 Salt、IV 與密文完全不同
  - 錯誤主密碼解密拋出明確之 `CryptoDecryptionError`，杜絕垃圾資料外洩
  - 既有明文金鑰讀取時自動觸發 `migrateApiKeysConfig` 原地平滑升級
- **縫隙 2：安全網路路由閘門 (`src/engine/secureProxyRouter.test.ts`)**
  - 偵測含 Token/API Key 請求，100% 排除公共代理池（corsproxy, allorigins, codetabs）
  - 純公開無憑證數據維持相容降級重試
  - 自訂 Proxy URL 強制 HTTPS，阻斷私有 IPv4 網段與雲端 Metadata (`169.254.169.254`) SSRF 攻擊
- **縫隙 3：CSV 消毒與備份脫敏 (`src/engine/csvSanitizer.test.ts`)**
  - OWASP 6 種危險字元 (`=, +, -, @, \t, \r`) 前置單引號消毒並雙引號包裹
  - 數值型別維持原生數值格式，不影響試算表計算
  - 全庫 JSON 備份支援一鍵脫敏匯出，清空 API 金鑰並標記 `isRedacted: true`

---

## 變更清單 (File Changes)

- `src/engine/cryptoEngine.ts` & `src/engine/cryptoEngine.test.ts`：Web Crypto 密碼學加密核心引擎與單元測試
- `src/engine/secureProxyRouter.ts` & `src/engine/secureProxyRouter.test.ts`：零憑證安全路由閘門與 SSRF 防禦
- `src/engine/csvSanitizer.ts` & `src/engine/csvSanitizer.test.ts`：OWASP CSV DDE 消毒與全庫備份脫敏
- `src/engine/priceFetcher.ts`：整合公共代理前憑證外發阻斷守衛
- `src/engine/corporateActionScanner.ts`：整合公共代理前憑證外發阻斷守衛
- `src/utils/storage.ts`：CSV 匯出採用 `sanitizeCSVCell` 全欄位消毒
- `src/utils/db.ts`：全量備份 `exportFullDatabaseJSON` 支援 `redactSensitive` 脫敏參數
- `src/components/SettingsWorkspace.tsx`：自訂 Proxy 即時 SSRF 檢核紅字提示與備份「脫敏匯出」開關
- `docs/specs/0116-web-crypto-cors-guard-and-csv-dde-sanitization-spec.md`：PRD 0116 需求規格說明書
- `.scratch/v8.35.0-web-crypto-and-security-hardening/issues/`：7 張本地 Tickets 鏡像
