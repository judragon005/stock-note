# 05 — Card 19 單週集保幾何防禦與 Card 09/15 資券當沖回退閉環

**Parent:** #590 (Spec 0238)
**What to build:** 修復單筆集保下的幾何與計算退化：當 `history.length === 1` 時，`buildTdccDistribution` 不再輸出誤導性 `+0.00%` 變動，改標記為「首週基準」並於 `TdccDistributionCard` 將單柱置中且繪製水平基準虛線；修復 `marketCacheLoader` 與 `AiForceDashboardView` 對 `dayTradeRate` 與 `sblBalance` 的獨立向前回退；並在 `ChipsSummaryCard` 補齊融資餘額與融券餘額的渲染顯示。
**Blocked by:** 03 — TDCC 集保 10 週、月營收 12 月與歷史配息按需序列補齊
**Status:** ready-for-agent

- [ ] `history.length === 1` 時，`change4WeeksRatio` 設為 `undefined`、徽章顯示「首週基準建立」，且 SVG 單柱置中渲染無折線消失孤立感。
- [ ] `loadSymbolFullLakehouseData` 對 `dayTradeRate` 獨立執行向前回退，且 `AiForceDashboardView` 將其納入 `marginData` 傳遞條件。
- [ ] `ChipsSummaryCard` 在台股模式下完整渲染融資餘額 (`marginBalance`) 與融券餘額 (`shortBalance`)。
- [ ] 補齊對應邊界單元測試並 100% 通過。
