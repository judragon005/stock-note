# Ticket #4: [Test & Doc] 單元測試 100% 覆蓋與架構文檔同步

- **狀態**: Completed
- **PRD**: [PRD 0007](../../docs/specs/0007-corporate-action-scanner-progress-and-resume.md)

## 任務清單
- [x] 於 `src/engine/corporateActionScanner.test.ts` 新增測試：
  - [x] 驗證 `onProgress` 在掃描過程中的回呼次數與數值正確性。
  - [x] 驗證並行加速 (Concurrency) 機制在多檔股票時的批次行為。
  - [x] 驗證 `AbortSignal` 能正確中止掃描並保留已完成部分。
  - [x] 驗證 `symbolsToScan` 斷點接續掃描與結果合併邏輯。
  - [x] 驗證 `CorporateActionSessionCache` 快取命中與 `forceRefresh` 清除邏輯。
- [x] 執行 `npm test` 確保 100% 測試通過。
- [x] 執行 `npm run build` 確保 TypeScript 編譯 0 錯誤。

