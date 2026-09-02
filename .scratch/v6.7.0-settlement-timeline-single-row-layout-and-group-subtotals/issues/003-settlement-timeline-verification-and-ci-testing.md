# 003 — settlement-timeline-verification-and-ci-testing

**What to build:**
針對在途資金時序排程單行化與分組小計執行全量回歸測試與專案建置驗證：
1. 確保 `src/engine/cashLedgerEngine.test.ts` 與其餘 31 個測試檔案（361+ 測試案例）100% 通過。
2. 確保 `npm run build` TypeScript 嚴格模式 0 錯誤。
3. 驗證 UI 視覺效果無水平溢出與文字直立斷行。

**Blocked by:** 002 — cash-ledger-timeline-container-and-group-subtotals

**Status:** closed

- [x] 執行 `npm test` 驗證 32 個測試檔案（361 個測試）100% 通過
- [x] 執行 `npm run build` 驗證 TypeScript 0 錯誤與 Vite 正式打包
- [x] 驗證單行條列元件之核銷按鈕互動與狀態切換流轉
