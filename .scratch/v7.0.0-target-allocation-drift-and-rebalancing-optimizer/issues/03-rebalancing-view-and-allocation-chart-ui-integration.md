# Ticket 03: 再平衡視覺化視圖與主圖表整合 (Rebalancing View & UI Integration)

## 任務描述
構建高質感、響應式的 `RebalancingView.tsx` 元件，並於 `AllocationChart.tsx` 整合 Tab 切換按鈕，提供使用者流暢的目標配置調整、偏離度檢視與再平衡下單試算體驗。

## 涉及檔案
- `src/components/RebalancingView.tsx` (新建)
- `src/components/AllocationChart.tsx` (修改)

## 驗收標準 (Acceptance Criteria)
1. 在 `AllocationChart.tsx` 控制列新增「⚖️ 目標配置與再平衡」Tab 按鈕，支援在「樹狀圖」、「權重清單」與「目標再平衡」之間無縫切換。
2. **目標配置管理區**：
   - 支援切換「市場維度配置」與「個股維度配置」。
   - 提供「編輯目標比例」互動面板，支援動態增減項目與調整百分比，並提供合計 100% 之即時驗證。
   - 支援調整「偏離容忍度 (Tolerance Band)」門檻。
3. **偏離度視覺化對比區**：
   - 水平雙色長條圖呈現「當前實際佔比」vs「目標佔比」。
   - 顯示彩色偏離度 Badge (🟢 正常 / 🟡 輕度 / 🔴 顯著)。
4. **再平衡試算操作台**：
   - 提供「💧 定期注水加碼 (Cash-in)」與「🔄 全量買賣再平衡 (Full Rebalance)」切換。
   - 注水模式下提供注水金額輸入框與「代入可用現金」快捷按鈕。
   - 渲染推薦下單明細表格（包含動作、標的、單價、建議金額 TWD/USD、建議股數/張數、預估摩擦成本提示）。
