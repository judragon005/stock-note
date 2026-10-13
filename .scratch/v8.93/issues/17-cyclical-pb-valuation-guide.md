# Ticket 17: 景氣循環股 P/B 河流圖優先引導 (Cyclical P/B Valuation Guide)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 識別典型景氣循環股（如水泥、鋼鐵、塑化、航運、面板、記憶體）。
2. 在價值評估（`valuation`）分頁中新增專業導引提示：
   - 「💡 本標的具備強週期景氣循環特性。在獲利高峰時本益比常處於極端低檔（陷阱），建議優先以【股價淨值比 P/B 河流圖】取代 P/E 估值。」
3. 避免使用者落入「低本益比買在景氣頂點」的經典投資陷阱。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 景氣循環標的展示 P/B 河流圖優先提示。
* [ ] 專業券商觀點完整呈現。
