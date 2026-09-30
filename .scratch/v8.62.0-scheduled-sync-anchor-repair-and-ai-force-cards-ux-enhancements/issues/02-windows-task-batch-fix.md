# 02 — Windows 排程批次檔修復 (消除空白與設定工作目錄)

**What to build:**
修正 `scripts/market-sync/setup-windows-task.bat` 中以 `where node` 提取執行檔時產生的尾隨空格，並在呼叫 `schtasks /create` 時明確指定工作目錄或完整絕對路徑引數。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 修正 `%NODE_PATH%` 變數賦值，防止尾隨空格污染。
- [ ] 驗證註冊後排程內容正確無誤。
