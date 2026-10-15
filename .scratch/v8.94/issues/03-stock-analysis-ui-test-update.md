# Ticket 03: StockAnalysisWorkspace.ui.test.tsx 單元測試斷言更新與純粹性驗收

## 1. 任務目標
更新並強化 `src/components/analysis/StockAnalysisWorkspace.ui.test.tsx`，加入防禦性斷言，確保個股深度分析視圖中**100% 零殘留**提示詞面板相關文字與 DOM 節點。

## 2. 修改範圍
* `src/components/analysis/StockAnalysisWorkspace.ui.test.tsx`:
  - 增加測試案例：`驗證個股深度分析工作區不再渲染智策多維提示詞引擎面板與思考帽標籤`。
  - 驗證 `expect(html).not.toContain('智策多維提示詞引擎')`。
  - 驗證 `expect(html).not.toContain('思考帽')`。

## 3. 驗收標準 (AC)
- [ ] 執行 `npx vitest run src/components/analysis/StockAnalysisWorkspace.ui.test.tsx` 100% 綠燈通過。
- [ ] 確保無假陽性（False Positive）。
