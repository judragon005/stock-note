# Issue 04: 單元測試與 TypeScript 構建驗證 (TDD & Build Verification)

## 狀態

- 狀態：`CLOSED` (全專案 57 套件 643 測試 100% 綠燈，npm run build 0 錯誤)
- 負責人：Agent
- 標籤：`ready-for-agent`, `test`, `ci`

## 需求說明

1. 在 `src/engine/priceFetcher.test.ts` 擴充測試：
   - 驗證 `inferMarketFromSymbol` 對 `6204`、`6204.TWO`、`2330.TW`、`00403A`、`BRK.B`、`NVDA` 的正確判定。
   - 驗證 `getYahooCandidateSymbols` 對台美雙市場候選代碼之產出。
2. 在 `src/engine/historicalOhlcvBackfill.test.ts` 新增測試：
   - 模擬台股首選 `.TW` 404 時自動重試 `.TWO` 並成功回傳日 K 的雙軌探測行為。
   - 模擬美股首選代碼失敗時自動重試連字號或去點代碼。
3. 執行全量 `npm test` 與 `npm run build`，確保 100% 綠燈與 0 型別錯誤。
