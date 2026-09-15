# 07 — 全量回歸測試與構建校驗 (Full Regression Audit & Build)

**What to build:**
落實 AGENTS.md 防禦性開發準則，確保所有新腳本、載入器與 UI 變更不破壞既有功能。執行全套單元測試，達成 100% 通過與 TypeScript 編譯 0 錯誤；同步更新 `CONTEXT.md` 與交接文檔。

**Blocked by:** Ticket 01, 02, 03, 04, 05, 06

**Status:** ready-for-agent

- [x] 執行 `npm test`，確認既有 100+ 個測試套件與新增測試全數 Pass (98 檔案, 936 測試 100% 通過)
- [x] 執行 `npm run build`，確保 TypeScript 零錯誤與 Vite 產包乾淨無告警
- [x] 同步更新 `CONTEXT.md`、ADR 與交接記錄
