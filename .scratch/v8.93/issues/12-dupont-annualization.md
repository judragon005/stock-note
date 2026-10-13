# Ticket 12: 杜邦分析總資產週轉率年化校正 (DuPont Annualization)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'dupont'` 區塊。
2. 修正總資產週轉率計算：
   - 原公式：`latestRecord.income.revenue / latestRecord.balanceSheet.totalAssets`（單季流量直接除以存量，導致週轉率縮水 4 倍）。
   - 修正為年化營收：採用近 4 季累計 TTM 營收（或單季營收 $\times 4$）除以總資產。
3. 確保杜邦三因子相乘後趨近於年化 ROE。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 總資產週轉率完成流量年化處理。
* [ ] 週轉率數值符合專業會計慣例。
