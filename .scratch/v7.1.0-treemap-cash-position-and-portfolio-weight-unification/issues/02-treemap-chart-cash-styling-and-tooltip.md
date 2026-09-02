# Ticket 02: TreemapChart 現金節點視覺語意、專屬配色與 Tooltip 整合

## 任務描述
修改 `TreemapChart.tsx`，擴充 `TreemapChartProps` 接收 `cashBalanceTwd`，在持有正現金餘額時自動注入 `CASH_TWD` 節點，並設計中性深灰藍石板色視覺樣式、固定 0.0% 損益與現金專屬 Tooltip。

## 涉及檔案
- `src/components/TreemapChart.tsx`

## 驗收標準 (Acceptance Criteria)
1. `TreemapChartProps` 增加 `cashBalanceTwd?: number` 可選參數。
2. 當 `cashBalanceTwd > 0` 時，自動在 `treemapItems` 注入 `{ id: 'CASH_TWD', symbol: '💵 現金', name: 'Cash / 活存與備用金', market: 'CASH', value: cashBalanceTwd, pnlPercent: 0 }`。
3. 現金節點視覺語意映射：
   - 背景填充：中性深灰藍石板色 `hsla(215, 25%, 27%, 0.85)` / `#334155`。
   - 邊框顏色：板岩灰 `#64748b`（懸停時為 `#ffffff` 2.5px glow）。
   - 損益與權重文字：顯示 `0.0% (XX.X%)`。
4. 現金節點 Tooltip 資訊：清晰展示「💵 現金 (Cash)」、「流動資金 / 活存餘額」、折合台幣總值、佔比與「0.0% (無損益波動)」。
