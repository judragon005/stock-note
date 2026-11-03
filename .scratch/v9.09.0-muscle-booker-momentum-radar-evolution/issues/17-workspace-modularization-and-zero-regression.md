# 17 — 主工作區模組化組裝與壓降 (MuscleBooker Modularization & Zero Regression)

**What to build:**
完成巨型上帝組件的最終解耦與組裝：
1. 拆解剩餘子組件：
   - `MuscleBookerHeader.tsx` (標題、池切換、搜尋、自選股 CRUD)
   - `TrafficLightMatrix.tsx` (三色實戰導航儀)
   - `DarvasQuadrantGrid.tsx` (四大象限看板)
   - `DeductionTelescopeTable.tsx` (扣抵望遠鏡數據表格)
2. `MuscleBookerWorkspace.tsx` 重構為純裝配容器，長度由 2,464 行徹底壓降至 200 行以內。
3. 嚴格維持公開 Props 介面契約不變：
   ```ts
   export interface MuscleBookerWorkspaceProps {
     holdings: HoldingPosition[];
     historicalDailyPrices?: Record<string, Record<string, number>>;
     currentMarket?: 'ALL' | MarketType;
     onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
   }
   ```
4. 執行全站既有測試與新測試，確保 100% 通過（`npm test` 0 失敗，`npm run build` 0 警告錯誤）。

**Blocked by:** Ticket 16

**Status:** open

- [x] 建立 `MuscleBookerHeader`、`TrafficLightMatrix`、`DarvasQuadrantGrid`、`DeductionTelescopeTable`
- [x] `MuscleBookerWorkspace.tsx` 壓降至 200 行以內，透過自定義 Hook 與子組件組裝
- [x] 驗證公開 Props 介面 100% 相容
- [x] 執行 `npm test` 確保既有 35 個測試與所有新增測試全綠
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤

