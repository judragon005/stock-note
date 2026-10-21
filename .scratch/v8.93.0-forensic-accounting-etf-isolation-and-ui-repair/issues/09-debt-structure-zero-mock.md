# Ticket 09: 長短期金融借款排毒與台泥假數值清除 (Debt Structure Zero-Mock)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'debt_structure'` 區塊。
2. 徹底移除寫死台泥借款數值：
   - 移除短期借款 fallback `'227.6 億'`。
   - 移除長期借款 fallback `'1,454.2 億'`。
3. 若公司未單獨拆分揭露長短期借款，真實輸出 `'未單獨揭露'` 或 `'-'`。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 非台泥標的在無數據時，絕不出現 227.6 億或 1454.2 億。
* [ ] 空狀態提示清晰合規。
