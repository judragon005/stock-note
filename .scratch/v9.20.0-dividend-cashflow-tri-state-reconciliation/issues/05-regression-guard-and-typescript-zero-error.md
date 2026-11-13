# 05 — TDD 全量回歸驗證、無損相容性與 TypeScript 零錯誤閉環

**Parent:** #516

**What to build:**
執行全專案單元測試回歸與 TypeScript 建置驗證，確保在 `projectedCashflowEngine`、`dividendAggregator`、`DividendMonthlyChart`、`DividendHistoryTable` 改進後，全專案 `npm test` 100% 綠燈，`npm run build` TypeScript 0 錯誤。

**Blocked by:** 04 — 歷史明細表口徑提示與待入帳款項快捷轉化

**Status:** ready-for-agent

- [ ] `npm test` 100% 通過（包含既有 100+ 測試檔）
- [ ] `npm run build` TypeScript 0 錯誤
- [ ] 驗證無破版、無記憶體洩漏與跨市場（台美股）無損相容

