# Ticket 03: ETF 橫幅導引至【主力戰情室】(ETF Routing Banner)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StockAnalysisWorkspace.tsx`
* **測試檔案**：`src/components/analysis/StockAnalysisWorkspace.test.tsx`

## 2. 需求描述 (Description)
1. 當使用者手動輸入或搜尋 ETF 標的時，頂部警示橫幅文案修改為：
   > **「此標的為 ETF，不具備個股財務報表，建議前往【主力戰情室】檢視」**
2. 橫幅內提供直通按鈕，點擊可直接導向【主力戰情室】或切換至熱門普通股。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 橫幅文字精確符合指定文案。
* [ ] 具備前往主力戰情室之導流互動。
