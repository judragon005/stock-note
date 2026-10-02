# 11 — SettingsWorkspace 匯出匯入面板 E2EE 與安全加固整合 (Settings UI Integration)

**What to build:** 
在 `src/components/SettingsWorkspace.tsx` 的「資料庫備份與管理」區域擴充 E2EE 零知識備份匯出與解密匯入功能。提供友善的使用者互動對話框（密碼輸入、確認密碼、加密匯出進度提示、密文還原上傳）。

**Blocked by:** 03-validate-full-database-backup, 10-e2ee-backup-restore

**Status:** ready-for-agent

- [x] 在備份區新增「🔒 匯出 E2EE 零知識加密備份 (.e2ee.json)」按鈕與密碼設定對話框
- [x] 支援輸入使用者自訂主密碼並確認密碼一致性
- [x] 支援上傳 `.e2ee.json` 檔案並彈出密碼輸入框解密
- [x] 解密成功後透過 `validateFullDatabaseBackup` 進行輸入清洗並一鍵還原至 IndexedDB
- [x] 解密失敗時提供明確安全錯誤提示，不影響現有資料庫狀態
- [x] 建立或擴充前端組件單元測試，確保操作流程無阻塞
