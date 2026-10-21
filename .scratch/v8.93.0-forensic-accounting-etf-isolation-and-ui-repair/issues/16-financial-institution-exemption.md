# Ticket 16: 金融保險業指標合規豁免機制 (Banking & Finance Exemption)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/components/analysis/AnalysisMetricView.tsx`
  - `src/components/analysis/StockAnalysisWorkspace.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 依據標的代碼或產業屬性判定金融保險股（如 2881 富邦金、2882 國泰金、JPM、GS）。
2. 在財務指標檢視中實施專業豁免：
   - 負債比率：高於 85% 標記「金融業常態」，不亮高風險紅燈警訊。
   - 毛利率與存貨：標記「金融業不適用 (N/A)」，不判定未通過。
3. 杜絕金控銀行股查詢時出現偽陽性地雷警報。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 金融股查詢時負債比率與存貨指標免於錯誤警報。
* [ ] 財務健康度評分合理正常。
