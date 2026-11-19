# 15 — Zone 04 卡片與 TASK 2–5 分頁精修 (Card 09 / 11 / 15 / 16 / 17 / 18 + TaskPanels)

**Parent:** #592 (Spec 0239)
**What to build:** 完整修復 Zone 04 六張底盤決策卡與 4 大任務子頁籤 (`TaskPanels`)：Card 09 (`DayTradeRiskCard`) 單一 `riskIndex` 來源、`null` 防護並支援美股「日內波動與換手風險」視圖（ATR/RVOL/Short Float、零「張」字樣）；Card 11 (`HealthSummaryCard`) 第 4 環語意對齊「流動性風險（越低越佳）」、防窄螢幕溢位與 `NaN`；Card 15 (`ChipsSummaryCard`) 渲染 `trustConsecutiveDays`、修正 Sparkline 零軸/負值著色/空狀態、去重美股重複標籤並掛載 `rvol` Tooltip；Layer 7 與 Card 16/17 調整響應寬度防三環 `228px` 溢位、補 `NaN` 防護、Card 17 消費 `signalTierLevel` 並修正 `termId`；Card 18 (`MainForceVerdictCard`) 修正千分位逗號正則（`>=1,000 張` 膠囊不再消失）、修正 `'賣壓沉重'` 階段映射、三欄響應折行、彈窗定位/ESC/外部關閉與父層 `key={symbol}`、美股 `$`/`股` 單位與流動性閘門；`TaskPanels` 全面響應 `colorTheme`、`KdMaView` 補繪 MA 均線並修左界裁切、`MacdView` 修正負數 DIF 底背離公式並補空狀態、`TechnicalAlertsView` 實作美股專屬波動/財報/軋空警示（隔離台股處置分盤與 130% 維持率）、`RawDataView` 切標的重置頁碼並標註成交量單位。
**Blocked by:** 03 — 台股當沖 (TWTB4U)、TPEx 歷史防污染、處置狀態與董監質押管線修復, 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊
**Status:** ready-for-agent

- [ ] Card 09 美股顯示日內波動與換手/Short Float 指標且 0 處殘留台股「張/資券」；Card 11 第 4 環明確標示「流動性風險（越低越佳）」且於 `< 412px` 不溢位。
- [ ] Card 15 台股完整呈現 `trustConsecutiveDays` 與基準日、空 Sparkline 顯示友善提示、美股不重複印兩次 `conclusionLabel` 且響應 `colorTheme`。
- [ ] Card 16/17 於窄欄寬度下不水平溢位、無 `NaN%`、Card 17 消費 `data.signalTierLevel` 且 `colorTheme` 與全站一致。
- [ ] Card 18 正確解析 `+1,200 張` / `-2,500 張` 膠囊、`'賣壓沉重'` 高亮防禦/調節階段而非區間震盪、平板寬度正常折行、Modal 可按 ESC/點外部關閉且切標的自動重置、美股顯示 `$` 與 `股`。
- [ ] `TaskPanels` 全部 4 頁籤響應 `colorTheme`；`KdMaView` 繪出 MA 線且無左界文字裁切；`MacdView` 空頭新低段（`lowestDif < 0`）不再誤報底背離；`TechnicalAlertsView` 美股零台股處置/130% 維持率雜訊；`RawDataView` 切換標的重設至第 1 頁。
