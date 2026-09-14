# 05 — 股票健診一級工作區整合與全量驗收 (Stock Health Workspace & Integration)

**What to build:**
建構 `src/components/health/StockHealthWorkspace.tsx` 並整合進系統主導航：
1. 頂部藍色導航 Banner：「歡迎使用股票健診幫手...」，具備「關閉說明」折疊功能與狀態記憶。
2. 標的 Header：代碼、標的名稱、收盤價、漲跌幅、+ 追蹤按鈕、標的快速搜尋與持倉下拉切換器。
3. 響應式雙欄排版：
   - 左側：4 大健診卡片流（排除地雷股、定存股、成長股、便宜股）。
   - 右側側邊欄：「深入了解」常見問答指引（公司整體體質如何？健診指標有變化嗎？長期持有要注意什麼？）。
4. 點擊卡片細節喚起 `HealthReportModal`。
5. 全系統端對端驗收與全量單元測試回歸。

**Blocked by:** Ticket 01, Ticket 02, Ticket 03, Ticket 04

**Status:** done
Owner: Agent
Type: subtask
Parent-Issue: #55

- [x] 實作 `StockHealthWorkspace.tsx` 完整佈局
- [x] 實作標的搜尋切換與自動載入財報數據流
- [x] 整合至 `App.tsx` 導航列，新增「股票健診」Tab / 一級工作區
- [x] 實作右側「深入了解」Q&A 展開/引導互動
- [x] 執行 `npm test` 確保 100% 綠燈，`npm run build` TypeScript 0 錯誤
