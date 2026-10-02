# 09 — E2EE 零知識主密碼端對端加密核心 (E2EE Backup Engine Core)

**What to build:** 
實作純原生 Web Crypto API 驅動的 E2EE 備份加密模組 `src/engine/e2eeBackupEngine.ts`。提供 `exportE2EEEncryptedBackup(jsonPayload, passphrase)` 函式，利用 AES-GCM-256 與 PBKDF2 (100,000 次疊代) 將資料庫快照轉化為標準 E2EE 加密封包。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 定義標準 E2EE 封包結構 `E2EEBackupPayload`
- [x] 實作 PBKDF2 密鑰衍生演算法，結合隨機生成之 16-byte 鹽值 (Salt)
- [x] 採用原生 `crypto.subtle.encrypt` (AES-GCM-256，12-byte IV) 加密 JSON 字串
- [x] 產出標準格式之加密 JSON 字串（Base64 編碼之 Salt、IV 與 Ciphertext）
- [x] 單元測試 100% 覆蓋加密封包格式合規性，確認密文中不含任何明文字串
