# 03 — 全庫備份反序列化安全前置審核與匯入管線加固 (Validate Full Database Backup)

**What to build:** 
實作全庫備份反序列化前置安全檢核純函式 `validateFullDatabaseBackup(parsed: unknown)`，並重構 `importFullDatabaseJSON`（`src/utils/db.ts`）與 `validateTradesSchema`（`src/utils/storage.ts`），全面杜絕全庫惡意備份投毒。

**Blocked by:** 01-safe-sanitize-object, 02-sanitize-trade-record

**Status:** ready-for-agent

- [x] 驗證頂層 JSON 結構具備合法之 `data` 屬性，防範非預期類型傳入
- [x] 結合 `safeSanitizeObject` 進行深層物件原型清洗
- [x] 對 `trades`、`brokerAccounts`、`cashTransactions`、`loanRecords` 進行逐項安全驗證與不合規過濾
- [x] `importFullDatabaseJSON` 於解析時優先經過安全檢核器，無效時拋出明確安全錯誤
- [x] `validateTradesSchema` 注入數值邊界校驗，阻斷 `Infinity` 與負數進入持倉與會計模組
- [x] 單元測試驗證惡意備份檔被完全阻斷，正常備份檔 100% 完整還原入庫
