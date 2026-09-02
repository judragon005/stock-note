# Ticket 04: 全流程 TDD 測試與全量整合驗收 (Full TDD & Integration Verification)

## 任務描述
依據測試驅動開發 (TDD) 原則，編寫與擴充單元測試，涵蓋背景同步、雙看板拆分、配股配息合併健保扣除、待入帳計算、現金帳本自動連動流水與邊界條件，並確保全量測試與 TypeScript 編譯 100% 綠燈通過。

## 涉及檔案
- `src/components/DividendLogView.test.ts`
- `src/engine/taxComplianceEngine.test.ts`
- `src/engine/cashLedgerEngine.test.ts`
- `src/engine/receivableDividendEngine.test.ts`
- `src/engine/corporateActionScanner.test.ts`

## 驗收標準 (Acceptance Criteria)
1. 針對 2890 永豐金與一般單純配息、純配股、美股 30% 預扣等案例編寫完整單元測試。
2. 針對現金帳本在 `tax: 0` 時自動推導配股扣除健保並產生 `+NT$ 33,250` 流水編寫測試斷言。
3. 針對雙看板獨立渲染與空狀態占位卡片編寫測試斷言。
4. 執行 `npm test` 通過率 100%（38 個測試檔、430 個測試全數通過）。
5. 執行 `npm run build` TypeScript 0 錯誤。
