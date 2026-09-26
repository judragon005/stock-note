# 01 — 核心型態定義與工作區導航註冊 (Core Types & Workspace Registration)

**What to build:**
定義 `AiForceDashboardReport` 之整體 TypeScript 資料合約，並在 `src/components/WorkspaceTabs.tsx` 註冊「主力戰情室 (AI Force)」工作區 Tab 入口，掛載空的容器視圖元件，確保使用者能點選 Tab 並切換至該工作區。

**Blocked by:**
None — can start immediately

**Status:** completed

- [x] 在 `src/types/aiForceDashboard.ts` 定義嚴格資料契約與 18 卡片 payload 型態
- [x] 在 `src/components/WorkspaceTabs.tsx` 新增 `aiforce` 工作區選項與圖標徽章
- [x] 在 `src/components/aiForceDashboard/AiForceDashboardView.tsx` 建立骨架元件並接通 App.tsx 切換
- [x] 執行單元測試與 TypeScript 類型檢查 100% 通過
