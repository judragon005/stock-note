# Ticket 11: 現金股利發放率公式校正與全年 EPS 聚合 (Dividend Payout Repair)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'dividend_payout'` 區塊。
2. 修正分母計算：
   - 移除 `const matchedQuarter = records.find((r) => r.year === d.year);`（此舉導致只拿單季 EPS 作為分母，發放率虛高 4 倍）。
   - 修正為聚合該年度 4 季累計 EPS：`const yearEps = records.filter(r => r.year === d.year).reduce((sum, r) => sum + (r.income?.eps || 0), 0);`。
3. 修正發放率公式：`const payout = yearEps > 0 ? Math.round((d.cashDividend / yearEps) * 100) : 0;`。
4. 移除 `payout > 0 ? payout : 65` 寫死 65% 之造假邏輯。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 發放率分母為全年 4 季累計 EPS。
* [ ] 排除寫死 65% 假資料。
