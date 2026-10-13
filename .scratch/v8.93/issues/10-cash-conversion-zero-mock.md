# Ticket 10: 現金轉換循環 CCC 排毒 (Cash Conversion Cycle Zero-Mock)

## 1. 權責範圍 (Scope)
* **核心檔案**：`src/components/analysis/AnalysisMetricView.tsx`
* **測試檔案**：`src/components/analysis/AnalysisMetricView.test.tsx`

## 2. 需求描述 (Description)
1. 檢視 `AnalysisMetricView.tsx` 中 `subTab === 'cash_conversion'` 區塊。
2. 徹底移除寫死 `68 天` 邏輯：
   - 移除 `const ccc = Math.round(tm?.cccDays || 68);`。
3. 若 `tm?.cccDays` 無法計算或為 null/undefined，輸出 `'-'` 並標記 `isNoData: true`。

## 3. 驗收標準 (Acceptance Criteria)
* [ ] 柱狀圖無數據時呈現平底標記與 `-`，絕不 fallback 68 天。
