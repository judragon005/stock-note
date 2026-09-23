# 05 — 單元測試驗證與全域回歸測試 (TDD & Full Regression)

**What to build:**
為 Tooltip 智慧避讓、官方發放日對照庫、KPI 雙軌切換與年度對帳面板建立完整的 Vitest 單元測試，確保全域測試 100% 綠燈，且 TypeScript 編譯 0 錯誤。

**Blocked by:** 01, 02, 03, 04

**Status:** ready-for-agent

- [ ] 在 `receivableDividendEngine.test.ts` 驗證官方發放日對照解析邏輯
- [ ] 在 `dividendAggregator.test.ts` 驗證跨年發放日精準歸屬
- [ ] 執行全域 `npm test` 確保全部測試 100% 綠燈通過
- [ ] 執行 `npm run build` 確保 TypeScript 型別安全與 Vite Bundle 成功建置
