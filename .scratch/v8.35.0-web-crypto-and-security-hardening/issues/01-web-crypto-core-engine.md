# 01 — Web Crypto 密碼學加密核心引擎與 EncryptedPayload 模型 (Web Crypto Core Engine)

**What to build:**
基於標準 W3C Web Crypto API (`window.crypto.subtle`) 實作零外部依賴的客戶端加密核心模組 `cryptoEngine.ts`。採用 AES-GCM 256-bit 對稱加密演算法，搭配 PBKDF2 (HMAC-SHA-256、100,000 次疊代) 進行金鑰衍生。每次加密動態生成 16-byte 密碼學隨機 Salt 與 12-byte 隨機 IV，並產出標準化的 `EncryptedPayload`（包含 version, algorithm, salt, iv, ciphertext 等 Base64 欄位）。提供對稱的解密函數，當主密碼錯誤或密文遭竄改時精準拋出明確之密碼學異常，杜絕垃圾資料外洩。

**Blocked by:** None — can start immediately

**Status:** complete

- [x] 定義標準 `EncryptedPayload` 型別介面（version: 1, algorithm: 'AES-GCM', salt, iv, ciphertext）
- [x] 實作 PBKDF2 金鑰衍生函數，疊代 100,000 次並採用 HMAC-SHA-256
- [x] 實作 AES-GCM 256-bit 加密函數，每次生成獨立 16-byte Salt 與 12-byte IV，並產出 Base64 封裝
- [x] 實作 AES-GCM 256-bit 解密函數，能以正確密碼無損還原字串/物件，密碼錯誤時拋出特定錯誤
- [x] 單元測試於 `src/engine/cryptoEngine.test.ts` 驗證加解密往返、隨機熵 (連續兩次密文不同) 與錯誤密碼攔截
