# 04 — 全量回歸測試與構建校驗 (Full Regression Audit & Build)

**What to build:**
落實 AGENTS.md 防禦性開發準則，確保所有新樣式與設定面板變更不破壞既有功能。執行全套單元測試，達成 100% 通過與 TypeScript 編譯 0 錯誤；同步更新 `CONTEXT.md` 與交接手冊。

**Blocked by:** Ticket 01, 02, 03

**Status:** ready-for-agent

- [ ] 執行 `npm test`，確認全套 98+ 個測試檔案全數通過
- [ ] 執行 `npm run build`，確保 TypeScript 零錯誤與 Vite 打包通過
- [ ] 同步更新 `CONTEXT.md` 與交接手冊
