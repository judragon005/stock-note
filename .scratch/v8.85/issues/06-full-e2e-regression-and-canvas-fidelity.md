# Ticket 06: 全端回歸驗證、Canvas 快照高畫質保真與測試套件全面綠燈

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (AC US-06, 完整回歸驗證)

## 問題背景
確保新剪貼簿工具、數據注入、R-Multiple 與 Smart Paste 整合後，不破壞既有 Canvas 快照下載器 (`dashboardCanvasExporter.ts`)，且全端單元測試與構建保證 100% 綠燈零警告。

## 任務細節
1. 驗證與更新 `src/engine/dashboardCanvasExporter.ts`：
   - 確認快照渲染 7 步投資筆記時，若包含 `thesisInvalidation` 亦能優雅排版呈現或安全忽略，不拋出 undefined 錯誤。
   - 驗證從主力戰情室點擊「導出快照 PNG」時產出的 1920x1080 圖片無零元或破版。
2. 完整執行單元測試：
   - 執行 `npm test`，確保所有既有與新增測試 100% 通過。
3. 執行 TypeScript 與 Production Build 檢查：
   - 執行 `npm run build`，確保 0 error、0 類型警告。

## 驗收標準
- [x] `npm test` 全部通過 (100% pass)。
- [x] `npm run build` 成功建置。
- [x] 無任何未處理之 Promise Rejection 或 Console Error。
