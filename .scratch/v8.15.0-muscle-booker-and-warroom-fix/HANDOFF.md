# V8.15.0 宏觀戰情室原生樣式重塑、色彩模式連動與肌肉書僮動能雷達專屬工作區交接手冊 (HANDOFF.md)

## 1. 迭代概述
本迭代徹底修復了三大核心體驗與架構問題：
1. **宏觀戰情室樣式修復**：徹底擺脫無效的 Tailwind 依賴，以專案原生設計系統與 CSS 變數重構，呈現金融終端機毛玻璃美學。
2. **持倉膠囊色彩連動**：全面改用 `var(--gain-color)`、`var(--loss-color)`，100% 響應頂部「紅漲綠跌 / 綠漲紅跌」按鈕切換。
3. **貫通肌肉書僮計算鏈並修復 Look-ahead 盲區**：在 `computeTechnicalIndicators` 串聯 `detectDarvasBox`，並修復了當日創新高被誤判為箱內的 Look-ahead Bug。
4. **獨立新增「💪 肌肉書僮·動能雷達」專屬工作區**：提供「在倉持股 / 法人焦點 Top 30 / 權值 Top 50」三軌切換，實時呈現四象限箱子型態看板與扣低翻揚望遠鏡。

## 2. 交付清單
- **PRD 規格書**：[docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md](../../docs/specs/0096-muscle-booker-workspace-and-war-room-styling-fix-spec.md)
- **架構決策紀錄 (ADR)**：[docs/adr/0096-muscle-booker-workspace-and-war-room-styling-fix.md](../../docs/adr/0096-muscle-booker-workspace-and-war-room-styling-fix.md)
- **本地任務票券**：
  - [x] [Ticket #1: 戰情室原生 CSS 與膠囊色彩主題修復](issues/01-warroom-vanilla-css-and-holding-capsule-color-theme-fix.md) (`CLOSED`)
  - [x] [Ticket #2: 打通 computeTechnicalIndicators 的肌肉書僮計算鏈](issues/02-connect-muscle-booker-to-compute-technical-indicators.md) (`CLOSED`)
  - [x] [Ticket #3: 獨立建置肌肉書僮動能雷達工作區](issues/03-muscle-booker-dedicated-workspace.md) (`CLOSED`)
- **核心實作組件**：
  - [src/index.css](../../src/index.css)：戰情室與動能雷達原生毛玻璃 CSS 類別宣告。
  - [src/components/WarRoomWorkspace.tsx](../../src/components/WarRoomWorkspace.tsx)：徹底移除 Tailwind，重塑為純 Vanilla CSS 終端機排版。
  - [src/components/common/HoldingSignalCapsules.tsx](../../src/components/common/HoldingSignalCapsules.tsx)：改用 CSS 變數 `--gain-color`、`--loss-color`。
  - [src/engine/technicalIndicatorEngine.ts](../../src/engine/technicalIndicatorEngine.ts)：在 `computeTechnicalIndicators` 整合肌肉書僮指標。
  - [src/engine/muscleBookerEngine.ts](../../src/engine/muscleBookerEngine.ts)：修復 fallback 取值排除當日 K 線之 Look-ahead Bug。
  - [src/components/MuscleBookerWorkspace.tsx](../../src/components/MuscleBookerWorkspace.tsx)：全新建立肌肉書僮四象限動能雷達看板。
  - [src/components/WorkspaceTabs.tsx](../../src/components/WorkspaceTabs.tsx)：註冊 `musclebooker` 頁籤。
  - [src/App.tsx](../../src/App.tsx)：掛載 `activeTab === 'musclebooker'` 視圖。
  - [src/components/MuscleBookerWorkspace.test.ts](../../src/components/MuscleBookerWorkspace.test.ts)：單元測試。

## 3. 測試與驗證結果
- **單元測試**：全專案 56 個測試檔案、607 項測試 100% 綠燈通過。
- **打包檢查**：`tsc && vite build` 0 錯誤編譯成功。
