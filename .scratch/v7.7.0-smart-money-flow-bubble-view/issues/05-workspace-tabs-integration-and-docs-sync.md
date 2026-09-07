# 05 — 工作台整合、全量驗證與文檔同步 (Workspace Integration, E2E Verification & Docs Sync)

**What to build:**
將籌碼觀察儀無縫嵌入主應用程式，並執行全量工程驗收與文檔同步：
1. 擴充頂部導航列 `WorkspaceTabs.tsx`，加入「籌碼與聰明錢 (Chips)」分頁，配置專屬圖示與標籤徽章。
2. 在 `App.tsx` 串接主工作台，與當前持倉資料及全域色彩模式完全同步。
3. 執行全量 `npm test`（確保 100% 通過、0 既有功能回歸損壞）與 `npm run build`（TypeScript 0 報錯）。
4. 建立架構決策紀錄 `docs/adr/0077-smart-money-bubble-view-and-chip-flow-dynamics.md`，同步更新 `CONTEXT.md` 領域模型術語庫與 `README.md`。

**Blocked by:** 04 — 歷史時序播放器與彗星位移軌跡

**Status:** closed

- [x] 工作台成功新增「籌碼與聰明錢」分頁，可流暢切換與保留狀態
- [x] 全域主題色彩模式切換時，籌碼泡泡多空顏色即時切換
- [x] 本地 `npm test` 通過率 100%，`npm run build` 無任何型別錯誤
- [x] 新增 ADR 0077 並同步更新 `CONTEXT.md` 核心術語庫

