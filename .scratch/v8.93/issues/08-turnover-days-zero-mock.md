# Ticket 08: 營運天數排毒與真實空狀態 (Turnover Days Zero-Mock)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'turnover_days'` 區塊。
2. 徹底移除寫死假資料：
   - 移除 `turnoverMetrics?.dsoDays ? ... : '42 天'`。
   - 移除 `turnoverMetrics?.dioDays ? ... : '56 天'`。
   - 移除 `turnoverMetrics?.cccDays ? ... : '68 天'`。
3. 若缺少應收、存貨或應付帳款數據，統一輸出 `'- 天'` 或標註 `'無揭露'`，絕不欺騙使用者。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 缺漏數據時畫面展示真實空狀態 `-`。
* [ ] 絕不出現 42、56、68 等寫死數值。
