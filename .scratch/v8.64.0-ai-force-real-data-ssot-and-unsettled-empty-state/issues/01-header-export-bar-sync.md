# 01 — 資訊列說明文字真實動態綁定 (HeaderExportBar Data Range & Source Sync)

**What to build:**
修復 `AiForceDashboardView.tsx` 與 `HeaderExportBar.tsx` 之間的 props 傳遞脫鉤問題。將 `report.marketBar.dataSourceText` 與 `report.marketBar.dataRangeText` 真實傳入 `HeaderExportBar`，使中間資訊列即時反映當前查詢標的之資料來源與涵蓋日期區間，徹底終結寫死之「2026-05-04 ~ 2026-09-18，共 98 個交易日」現象。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] `AiForceDashboardView.tsx` 調用 `<HeaderExportBar>` 時完整傳入 `sourcesText` 與 `rangeText`。
- [x] `HeaderExportBar.test.ts` 驗證傳入自訂 `sourcesText` 與 `rangeText` 時正確呈現。
- [x] 單元測試 100% 通過。

