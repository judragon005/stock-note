# Ticket 14: 美股季配息年化識別與真實殖利率計算 (US Dividend Annualization)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/components/analysis/AnalysisMetricView.tsx`
  - `src/engine/dividendService.ts`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 針對美股市場標的（market: 'US'），識別季度配息頻率（Quarterly Dividend）。
2. 在計算現金殖利率與平均股息河流圖時，自動將季度股息進行年化（$\times 4$）或取近 4 次配息加總，杜絕殖利率縮水 4 倍。
3. 修正殖利率顯示，使美股科技龍頭（如 AAPL、MSFT）或高股息美股殖利率還原至真實水準。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 美股標的之股息殖利率正確反映年化水準。
* [ ] 年配息台股與季配息美股平滑適應。
