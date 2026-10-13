# Ticket 15: 台美雙市場計價單位與幣別自適應 (Currency & Scale Adaptive)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 依據標的市場別（TW vs US）動態自適應幣別與金額單位：
   - 台股標的：標記 `NT$`、金額單位為 `億元 (NT$ 100M)`。
   - 美股標的：標記 `US$`、金額單位為 `百萬 (M) / 十億 (B)`。
2. 修正圖表標題與軸線文字，切換至美股時不顯示「新台幣元」之錯誤標籤。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 美股標的全部以 USD / M / B 為單位。
* [ ] 台股標的維持 TWD / 億元 單位。
