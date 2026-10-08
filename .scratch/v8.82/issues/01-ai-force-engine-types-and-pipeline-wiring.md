# 01-ai-force-engine-types-and-pipeline-wiring

## Description
在主力戰情室型別系統與核心引擎中擴充 TDCC 集保股權分散表與月營收歷史資料結構；貫通 `AiForceDashboardView.tsx` 與 `marketCacheLoader.ts` 數據流；徹底消滅 `buildInstitutionalFlow` 針對美股及無籌碼標的之偽外資/投信張數捏造算式，貫徹 Zero-Mock 原則。

## Target Files
- `src/types/aiForceDashboard.ts`
- `src/engine/aiForceDashboardEngine.ts`
- `src/components/aiForceDashboard/AiForceDashboardView.tsx`
- `src/engine/aiForceDashboardEngine.test.ts`

## Acceptance Criteria
- [x] 擴充 `types/aiForceDashboard.ts`，定義 `TdccDistributionData` 與 `MonthlyRevenueData` 介面。
- [x] `generateAiForceReportFromCandles` 支援接收 `tdccRecords` 與 `revenueRecords`，並輸出至報表物件。
- [x] `AiForceDashboardView.tsx` 從 `loadSymbolFullLakehouseData` 提取 `tdccRecords` 與 `revenueRecords` 並傳遞至報表引擎。
- [x] 徹底移除 `buildInstitutionalFlow` 針對美股 fallback 的 `Math.round(volume * 0.12 * 0.6)` 捏造算式。
- [x] 編寫 `aiForceDashboardEngine.test.ts` 單元測試，確保管線流通且無任何捏造籌碼。

## Status
- [x] completed
