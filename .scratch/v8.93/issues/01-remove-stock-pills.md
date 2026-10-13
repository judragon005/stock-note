# Ticket 01: 移除快捷標的膠囊列 (Stock Pills Removal)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/StockAnalysisWorkspace.tsx`
* **測試檔案**：`src/components/analysis/StockAnalysisWorkspace.test.tsx`

## 2. 需求描述 (Description)
1. 自 `StockAnalysisWorkspace.tsx` 中徹底拔除 `quickPills` 陣列定義與動態計算邏輯。
2. 刪除頂部橫向滾動之快捷標的按鈕列（`Flame` 快捷標的區塊）。
3. 確保畫面頂部直接乾淨展開為標的 Header（名稱、代碼、現價、追蹤按鈕、下拉搜尋列）。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 畫面中完全不渲染「快捷標的:」文字或 Flame 膠囊按鈕。
* [ ] 標的切換與即時報價不受影響。
