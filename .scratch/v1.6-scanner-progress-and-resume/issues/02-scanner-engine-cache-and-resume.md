# Ticket #2: [Engine] Session 級個股記憶體快取與斷點接續模組

- **狀態**: Completed
- **PRD**: [PRD 0007](../../docs/specs/0007-corporate-action-scanner-progress-and-resume.md)

## 任務清單
- [x] 於 `src/engine/corporateActionScanner.ts` 實作 `CorporateActionSessionCache`（支援 `get`、`set`、`clear`）。
- [x] `scanCorporateActions` 支援 `symbolsToScan?: string[]`，允許指定僅掃描特定股票（供斷點接續或重試未完成項目使用）。
- [x] 支援 `forceRefresh?: boolean`，若為 true 則繞過快取並強制向遠端端點發送請求。
- [x] 精確維護各個股比對結果，避免接續掃描時產生重複事件或覆蓋現有結果。

