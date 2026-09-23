# 05 — 全域回歸審計、建置驗證與技術文件同步 (Regression Audit & Doc Sync)

**What to build:**
1. **全域測試套件驗證**：
   - 執行 `npm test`，確保 490+ 項測試維持 100% 綠燈，無任何回歸破壞。
2. **TypeScript 編譯檢查**：
   - 執行 `npm run build`，確保 0 TS 錯誤、0 Lint 警告。
3. **專案文檔與領域模型同步**：
   - 更新 `CONTEXT.md`，記載「股利現金流一律以有效入帳日 (Effective Pay-Date) 為時序 SSOT」之領域共識。
   - 於各 Tickets 勾選已完成項目。

**Blocked by:** Ticket 01, Ticket 02, Ticket 03, Ticket 04

**Status:** closed
- [x] 執行 `npm test` 達成 100% 全量通過 (958/958 通過)
- [x] 執行 `npm run build` 達成 0 錯誤
- [x] 同步更新 `CONTEXT.md` 領域術語與時序決策
- [x] 完成全域任務票券核對
