# 05 — 本地儲存持久化與 JSON/CSV 雙向備份還原 (Persistence & Backup/Restore)

**What to build:**
實現本機 LocalStorage 自動持久化與結構遷移防護；提供一鍵匯出完整結構化 JSON 備份檔，以及相容 Excel 繁體中文 UTF-8 BOM 之 CSV 檔案；支援從 JSON/CSV 檔案無損還原數據。

**Blocked by:** 04 — 持倉總覽表 (行內現價快修) 與交易明細搜尋過濾 (Holdings Table & Trade History Filter)

**Status:** ready-for-agent

- [ ] 每次交易變更自動儲存至 LocalStorage，重整頁面不遺失。
- [ ] 匯出 JSON 可在其他裝置完全還原所有交易與自訂設定。
- [ ] 匯出 CSV 於 Excel 開啟時繁體中文無亂碼。
