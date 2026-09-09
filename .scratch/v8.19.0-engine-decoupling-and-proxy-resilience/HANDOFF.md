# V8.19.0 引擎邏輯解耦、Fast Refresh 規範化與開發代理異常防護交接手冊 (HANDOFF)

## 1. 任務核心變更概述

為提升工程架構強健性、消滅終端機未捕獲異常並確保開發者體驗，全面完成以下四項核心重構與修復：

1. **量化運算與常數全面解耦至領域引擎層 (`src/engine/muscleBookerEngine.ts`)**：
   - 將 `MuscleBookerWorkspace.tsx` 內之資產池常數字典（`TW50_BLUE_CHIP_SYMBOLS`、`US_MEGA_50_CORE_SYMBOLS`、`TW_TOP_30_FOCUS_SYMBOLS`、`US_TOP_30_FOCUS_SYMBOLS`）、白話百科字典 `BEGINNER_TOOLTIPS`、型別定義（`AssetPoolType`、`ScannedStockItem` 等）以及核心運算函式（`getScopedUniverseSymbols`、`scanMuscleBookerItem`）徹底收攏遷移至 `src/engine/muscleBookerEngine.ts`。
   - `MuscleBookerWorkspace.tsx` 僅保留 React UI 元件與 Props 介面之匯出，徹底符合 `@vitejs/plugin-react` Fast Refresh 規範，消除 `Could not Fast Refresh (export is incompatible)` 警告，重獲毫秒級模組熱重載 (HMR)。
   - 同步修正 `WarRoomWorkspace.tsx` 與 `MuscleBookerWorkspace.test.ts` 之 import 引用來源。

2. **Vite 開發代理異常彈性防護 (Proxy Resilience)**：
   - 針對 `vite.config.ts` 中的各個外部代理路由（`/api/yahoo`、`/api/twse`、`/api/twse-www`、`/api/tpex`），註冊 `configure: (proxy) => proxy.on('error', ...)` 事件監聽器。
   - 在本機斷網、DNS 故障或遠端伺服器連線逾時（`ENOTFOUND`, `ECONNRESET`, `ETIMEDOUT`）時，優雅攔截底層 socket 異常並回傳 HTTP 502 Bad Gateway，使終端機保持純淨無未捕獲錯誤堆疊，並正確觸發前端的 CORS 備援代理池。

3. **Markdownlint 工作區全量合規化**：
   - 修正 `.agents/skills/README.md`、`CONTEXT.md`、`.scratch/v6.1.0/issues/`、`.scratch/v8.18.0/issues/` 等檔案之 MD012（過多連續空白行）、MD022（標題周圍空白行）與 MD032（清單周圍空白行）格式規範。

4. **全端單元測試與構建驗證 (TDD & Build Verification)**：
   - 執行 Vitest 57 個測試套件、624 個單元測試 100% PASS。
   - 執行 `npm run build` TypeScript 0 錯誤、打包順利完成。

## 2. 異動檔案清單

- `src/engine/muscleBookerEngine.ts`: 擴充收攏資產池常數、小白百科字典與量化掃描函式。
- `src/components/MuscleBookerWorkspace.tsx`: 移除純資料與常數匯出，純淨化為 React 元件檔案。
- `src/components/WarRoomWorkspace.tsx`: 更新 import 引用至 `muscleBookerEngine`。
- `src/components/MuscleBookerWorkspace.test.ts`: 更新 import 引用並驗證引擎層導出。
- `vite.config.ts`: 為四大代理路徑掛載 proxy error handler，防止未捕獲連線異常崩潰終端機。
- `docs/specs/0100-engine-decoupling-fast-refresh-and-proxy-resilience-spec.md`: PRD #0100。
- `docs/adr/0100-engine-decoupling-fast-refresh-and-proxy-resilience.md`: ADR #0100。
- `.scratch/v8.19.0-engine-decoupling-and-proxy-resilience/issues/`: 建立 Issue 01~04 本地票券。
- `docs/handoff/2026-09-09-v8.19.0-engine-decoupling-and-proxy-resilience.md`: 正式交付手冊。
- `CONTEXT.md`: 同步更新領域模型。

## 3. 測試與構建驗證

- 單元測試：`57 passed / 57 test files (624 passed)`，100% 綠燈。
- 專案建置：`npm run build` 0 錯誤通過。
