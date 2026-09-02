# Issue #4: 繁中專業名詞懸停 Tooltip、會計模式切換器與批次抽屜 UI (UI & Tooltip)

## 任務目標
1. 實作通用型 `Tooltip` 懸停氣泡提示元件（滑鼠移入即刻顯示雙語中文解說）。
2. 在 `HoldingsTable.tsx` 整合會計沖銷模式下拉切換器（含各模式專屬 Tooltip）。
3. 建立 `LotsBreakdownModal.tsx`，支援展開查看在庫 Lot 明細、買進日期、持有天數與長短期徽章。
4. 在 `TradeModal.tsx` 賣出時新增「指定批次 (Specific Lot)」展開分配介面。

## 驗收標準
- 所有專業金融名詞（FIFO, LIFO, HIFO, Tax Lot, Tax-Loss Harvesting 等）均標註繁體中文並配置 Hover Tooltip。
- 支援流暢展開查看每個 Lot 的即時盈虧與持股天數。
