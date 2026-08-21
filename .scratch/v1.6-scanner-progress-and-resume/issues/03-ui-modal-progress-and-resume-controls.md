# Ticket #3: [UI] 智慧掃描彈窗進度條、即時狀態列與中止/接續操作控制

- **狀態**: Completed
- **PRD**: [PRD 0007](../../docs/specs/0007-corporate-action-scanner-progress-and-resume.md)

## 任務清單
- [x] 於 `src/components/CorporateActionScannerModal.tsx` 新增頂部進度條（發光漸變條、百分比動畫、`X / Y 檔` 計數器）。
- [x] 實作即時狀態列（動態顯示 `正在比對：2330 台積電...` 與 `已找到 N 筆事件`）。
- [x] 實作「中止掃描」按鈕與 AbortController 觸發邏輯，中止時立即凍結並保留已掃描事件。
- [x] 實作「接續掃描剩餘 (X 檔)」按鈕，點擊後精準呼叫引擎僅針對未完成股票續掃，並將新發現項目合併進勾選清單。
- [x] 實作「重新整理 / 強制全量重掃」按鈕，支援清除快取全量重新比對。
- [x] 優化空狀態與錯誤狀態提示，保持極致現代美學。

