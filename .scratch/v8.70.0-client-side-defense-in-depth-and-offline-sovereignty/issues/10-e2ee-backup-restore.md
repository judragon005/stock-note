# 10 — E2EE 零知識密文備份還原與驗證 (E2EE Backup Restore & Decryption)

**What to build:** 
於 `src/engine/e2eeBackupEngine.ts` 實作密文備份解密純函式 `decryptE2EEBackup(encryptedJson, passphrase)`。支援密文格式驗證、密鑰衍生、GCM 認證標籤 (Auth Tag) 驗證；若密碼錯誤或密文遭篡改，安全拋出標準異常。

**Blocked by:** 09-e2ee-backup-engine-core

**Status:** ready-for-agent

- [x] 驗證傳入 JSON 之 `format === 'STOCK_TRACKER_E2EE_BACKUP'` 與版本號
- [x] 依據 Salt 與使用者輸入密碼重新衍生對稱解密金鑰
- [x] 呼叫 `crypto.subtle.decrypt` 進行 AES-GCM 解密
- [x] 密碼錯誤或數據遭篡改時，強制拋出 `E2EEDecryptionError` 並阻斷外洩
- [x] 解密成功時還原出原始 JSON 字串，支援接續傳遞至安全性校驗器
- [x] 單元測試 100% 覆蓋成功解密、密碼錯誤阻斷、損毀密文阻斷與非 E2EE 檔案拒絕
