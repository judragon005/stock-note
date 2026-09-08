# V8.14.0 宏觀戰情室工作區、質押黑天鵝逃生矩陣與肌肉書僮持倉膠囊 UI 落地交接手冊 (HANDOFF.md)

## 1. 迭代概述
本迭代旨在徹底解決「5 大精選技術債量化底層引擎已實施完成，但前端視圖層尚未對齊渲染」的問題。
透過新增全功能「🏛️ 宏觀戰情室」工作區頁籤、升級「質押黑天鵝 6 維情境矩陣與斷頭求解彈窗」、以及擴充「持倉訊號肌肉書僮箱子戰術膠囊」，讓投資者在日常操作中直觀感受 5 大風控引擎之實戰防禦力。

## 2. 交付清單
- **規格書 (PRD)**：[docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md](../../docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md)
- **架構決策紀錄 (ADR)**：[docs/adr/0095-macro-war-room-stress-matrix-ui-integration.md](../../docs/adr/0095-macro-war-room-stress-matrix-ui-integration.md)
- **本地任務票券**：
  - [x] [Ticket #1: 宏觀戰情室工作區組件與頁籤註冊](issues/01-war-room-workspace-and-workspace-tabs.md) (`CLOSED`)
  - [x] [Ticket #2: 質押黑天鵝逃生矩陣彈窗升級](issues/02-upgrade-margin-stress-modal-with-matrix-and-escape.md) (`CLOSED`)
  - [x] [Ticket #3: 肌肉書僮持倉訊號膠囊整合](issues/03-holding-signal-capsules-muscle-booker-integration.md) (`CLOSED`)
- **核心代碼與組件**：
  - [src/components/WorkspaceTabs.tsx](../../src/components/WorkspaceTabs.tsx)：註冊 `warroom`（「🏛️ 宏觀戰情室」）與「AI 作戰方針」標籤。
  - [src/components/WarRoomWorkspace.tsx](../../src/components/WarRoomWorkspace.tsx)：宏觀戰情室全域看板（AI 晨報作戰方針、市場四柱脈搏、個人宏觀防護盾、雙重動能輪動排行榜、關鍵事件倒數日曆）。
  - [src/components/MarginStressModal.tsx](../../src/components/MarginStressModal.tsx)：升級 6 維情境卡片切換、個股 130% 斷頭臨界價求解表、三軌一鍵逃生救生圈指南。
  - [src/components/common/HoldingSignalCapsules.tsx](../../src/components/common/HoldingSignalCapsules.tsx) & [src/engine/technicalIndicatorEngine.ts](../../src/engine/technicalIndicatorEngine.ts)：擴充肌肉書僮箱頂突破、跌破箱底、底穿上反轉、月線扣抵翻揚與布林壓縮訊號。
  - [src/App.tsx](../../src/App.tsx)：主應用掛載 `warroom` 工作區視圖與即時聯動。

## 3. 測試與構建驗證
- **單元與整合測試**：`55 passed (55)`，共 `603 passed (603)`，0 錯誤，0 回歸。
- **TypeScript & Vite 構建**：`tsc && vite build` 0 錯誤編譯成功。
