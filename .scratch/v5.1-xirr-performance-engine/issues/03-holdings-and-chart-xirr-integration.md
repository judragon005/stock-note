# Ticket 03: UI 介面 XIRR 指標整合 (Holdings, Chart & Summary Cards Integration)

## 需求說明
- **`SummaryCards.tsx`**：
  - 在年化報酬率卡片支援切換 `[XIRR (資金加權) / CAGR (時間簡利)]`。
  - 清楚展示當前計算模式與公式口徑說明。
- **`PortfolioGrowthChart.tsx`**：
  - 在週期篩選（1M / 3M / 6M / 1Y / YTD / ALL）時，頂部關鍵統計卡片動態顯示當前選取區間的 XIRR。
  - 當持有天數 $< 30$ 天時，自動顯示 `(非年化)` 標籤。
- **`HoldingsTable.tsx`**：
  - 在持股清單與明細展開中，展示每檔持股的「含息 XIRR (年化)」指標。
  - 支援點擊 XIRR 數值觸發詳細診斷彈窗。

**Status:** todo

- [ ] 在 `SummaryCards.tsx` 新增 `[XIRR / CAGR]` 切換按鈕與展示邏輯。
- [ ] 在 `PortfolioGrowthChart.tsx` 整合週期動態 XIRR 指標展示。
- [ ] 在 `HoldingsTable.tsx` 整合個股含息 XIRR 指標與點擊事件。
