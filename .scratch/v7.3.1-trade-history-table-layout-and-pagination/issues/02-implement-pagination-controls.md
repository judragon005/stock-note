# Ticket #02: 歷史交易帳本現代分頁控制器 (Pagination Controls)

## 🎯 目標 (Objective)
為歷史交易帳本實裝流暢、直覺且具備毛玻璃質感的純前端分頁控制器。

## 📋 任務清單 (Tasks)
- [x] 狀態設計：在 `TradeHistoryTable.tsx` 加入 `currentPage` (預設 1) 與 `pageSize` (預設 50)。
- [x] 篩選聯動：當使用者輸入搜尋關鍵字或切換類別 (BUY/SELL/DIVIDEND/CORPORATE) 時，自動重置 `currentPage` 至 1。
- [x] 分頁器 UI：
  - 每頁筆數切換膠囊 (`25 筆`, `50 筆`, `100 筆`, `全部`)。
  - 上一頁 / 下一頁按鈕與目前頁數指示 (`第 X / Y 頁 · 共 N 筆`)。
  - 支援第一頁與最後一頁快速跳轉。
- [x] 切片資料渲染：以 `filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize)` 渲染當頁紀錄。

## 🛡️ 驗收標準 (Acceptance Criteria)
- [x] 分頁切換即時流暢，各頁筆數正確。
- [x] 測試套件 100% 通過 (465/465 綠燈)，TypeScript 0 錯誤。
