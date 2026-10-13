# Ticket 13: 經營週轉次數年化校正 (Turnover Rates Annualization)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'turnover_capability'` 區塊。
2. 修正應收帳款週轉率與存貨週轉率：
   - 應收週轉率：單季營收進行年化（$\times 4$）或取 TTM 營收除以應收帳款。
   - 存貨週轉率：單季銷貨成本（營業收入 - 毛利）進行年化（$\times 4$）或取 TTM 銷貨成本除以存貨。
3. 杜絕因單季未年化導致週轉次數僅剩全年 1/4 的計算偏差。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 應收帳款週轉率與存貨週轉率完成年化校正。
* [ ] 計算公式符合公開資訊標準。
