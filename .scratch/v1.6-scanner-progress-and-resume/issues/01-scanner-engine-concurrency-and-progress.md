# Ticket #1: [Engine] 掃描引擎受控並行、進度回呼與中斷支援

- **狀態**: Completed
- **PRD**: [PRD 0007](../../docs/specs/0007-corporate-action-scanner-progress-and-resume.md)

## 任務清單
- [x] 於 `src/engine/corporateActionScanner.ts` 定義 `ScanProgress` 與 `ScanCorporateActionsOptions` 介面。
- [x] 擴充 `scanCorporateActions` 支援 `options?: ScanCorporateActionsOptions`（含 `concurrency?: number` 預設 3、`signal?: AbortSignal`、`onProgress` 回呼）。
- [x] 實作受控並行池 (Worker Pool Pattern) 與請求微延遲 (100ms jitter)，並在每次 fetch 傳遞 `signal`。
- [x] 每完成一檔股票即時觸發 `onProgress({ current, total, currentSymbol, currentName, foundEventsCount, status })`。

