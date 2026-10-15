# Ticket 02: StockAnalysisWorkspace 清理提示詞專用狀態與冗餘特徵計算

## 1. 任務目標
清理 `StockAnalysisWorkspace.tsx` 內部專為 `StrategicPromptPanel` 計算的冗餘狀態與 imports（如 `synthesizeStockDigest`），減少每次選股切換時不必要的重渲染計算開銷。

## 2. 修改範圍
* `src/components/analysis/StockAnalysisWorkspace.tsx`:
  - 移除 `synthesizeStockDigest` 的引用。
  - 移除 `strategicDigest` 的 `useMemo` 計算區塊（約 346~380 行）。
  - 清理未使用的臨時變數。

## 3. 實作重點
* 確保不誤刪個股深度分析其他主題（如體質健康、三大報表、河流圖估值）所共用的持倉狀態或報價資訊。

## 4. 驗收標準 (AC)
- [ ] `StockAnalysisWorkspace.tsx` 無任何未使用的變數或 eslint 警告。
- [ ] 組件成功瘦身，去除提示詞專屬之特徵裝配開銷。
