# 07 — 全庫 JSON 備份脫敏機制與匯出設定 (JSON Backup Redaction & Export Settings)

**What to build:**
在系統備份與匯出工作流中實作資安脫敏引擎 `redactBackupData`。當使用者在設定工作區點擊「匯出全系統備份 (JSON)」時，介面新增「脫敏匯出 (Redacted Export)」開關選項（可配置預設勾選）。勾選時，自動遍歷備份資料結構，將所有敏感 API Token（如 `finmindToken`, `fmpApiKey`, `alphaVantageKey`、自訂 Header 金鑰）抹除清空為 `""`，並於備份檔案根中繼資料中寫入 `{ isRedacted: true, redactedAt: string }` 標記。同時在還原邏輯中相容該標籤，提示使用者在還原後若需即時行情需重新填寫金鑰，保護除錯分享時的憑證安全。

**Blocked by:** 06 — CSV Formula Injection DDE Sanitizer

**Status:** complete

- [x] 實作 `redactBackupData<T>(data: T): { data: T; isRedacted: boolean }` 脫敏函數
- [x] 能精確定位設定中的 `apiKeys` 物件與所有敏感金鑰欄位並予以抹除
- [x] 在 `SettingsWorkspace` 的備份匯出按鈕旁提供「脫敏匯出」核取方塊
- [x] 匯出 JSON 檔頭包含 `{ isRedacted: true }` 元數據
- [x] 單元測試驗證脫敏前後資料完整性：金鑰被完全抹除，交易、股利、資產帳本資料 100% 完整無損
