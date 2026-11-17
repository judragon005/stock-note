# 04 — 全局建置檢驗、文檔鏡像與 PR 閉環交付 (E2E & Delivery)

**What to build:**
執行全量測試 `npm test` 與型別檢查 `npm run build`。同步更新專案架構文檔（`CONTEXT.md` 與交接手冊），確保工作區無遺留臨時產物，完成 Git 分支合併與 PR 交付閉環。

**Blocked by:** 03 — 垂直呼吸間距、折疊動態與暗黑擬物視覺對齊 (Refactor & Styling)

**Status:** closed

- [x] `npm test` 通過率 100% (291 passed, 2283 tests)
- [x] `npm run build` 通過且 TypeScript 0 錯誤
- [x] 更新 `CONTEXT.md` 與建立 `ADR-0233`
- [x] 準備發起 PR 並關聯 Issue #578
