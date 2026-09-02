# Ticket 03: AllocationChart 總資產分母統一與三段式市場分佈條升級

## 任務描述
重構 `AllocationChart.tsx`，將資產分母統一為總資產（台股市值 + 美股市值 + 現金餘額），升級頂部市場進度條與標籤為三段式（台股/美股/現金），並將 `cashBalanceTwd` 精確傳遞至 `TreemapChart`。

## 涉及檔案
- `src/components/AllocationChart.tsx`

## 驗收標準 (Acceptance Criteria)
1. 總資產計算公式升級：`totalAssetsInTwd = items.reduce(...) + Math.max(0, cashBalanceTwd)`。
2. 頂部比例標籤升級：顯示 `🇹🇼 台股 XX.X%`、`🇺🇸 美股 XX.X%`、`💵 現金 XX.X%`（若現金為 0 則不顯示現金標籤）。
3. 頂部進度條升級為三段式彩色條：
   - 台股：`#3b82f6` (鮮明藍)
   - 美股：`#8b5cf6` (典雅紫)
   - 現金：`#10b981` (翡翠綠)
4. 正確將 `cashBalanceTwd` 屬性傳入 `<TreemapChart />`。
5. 「權重清單 (bars)」模式下，將現金作為一項獨立條目列入（若現金 > 0），確保長條圖模式與樹狀圖模式資產總額與權重 100% 互洽。
