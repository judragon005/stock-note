# Ticket 18: 法務會計五大排雷排毒燈 (Forensic Accounting Warning Lights)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 整合三表 cross-statement 跨表勾稽五大排雷燈：
   - 剪刀差警訊：應收帳款成長率顯著高於營收成長率。
   - 獲利純度：營業現金流 CFO / 稅後淨利 NI < 80%。
   - 存貨風險：存貨金額與週轉天數創歷史新高。
   - 資本失血：自由現金流 FCF 連續多季為負。
   - 股本稀釋：流通股數大幅增加。
2. 呈現直觀紅綠警報徽章與白話說明。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 具備客觀五大排毒警報檢驗。
* [ ] 符合法務會計真實勾稽規範。
