# 02 — 敏感金鑰密文持久化與明文原地平滑升級 (Secure Storage Persistence & Migration)

**What to build:**
將系統設定管理 (`storage.ts` 及 IndexedDB `settings` 表) 整合 Web Crypto 加密層。將使用者設定中的所有付費金融憑證（如 `finmindToken`, `fmpApiKey`, `alphaVantageKey`）轉換為 `EncryptedPayload` 格式持久化儲存。讀取時提供透明解密；若讀取到歷史版本的「純明文字串」金鑰，系統自動觸發「原地平滑升級 (Auto-Migration)」，以本機安全金鑰或預設金鑰將明文轉為密文封裝寫回儲存庫，實現無損向後相容與靜態儲存安全。

**Blocked by:** 01 — Web Crypto Core Engine

**Status:** complete

- [x] 在儲存介面層支援辨識 `EncryptedPayload` 與傳統字串之混合結構
- [x] 實作讀取敏感金鑰時的自動透明解密與快取機制
- [x] 實作「原地自動遷移 (Auto-Migration)」邏輯，無痛將既有明文 API Key 加密並寫回 IndexedDB / LocalStorage
- [x] 支援在無自訂主密碼時，採用本機設備唯一隨機種子進行透明封裝，確保免密碼流暢性
- [x] 單元測試驗證儲存庫升級流程、新舊格式相容性與重啟後持久化狀態
