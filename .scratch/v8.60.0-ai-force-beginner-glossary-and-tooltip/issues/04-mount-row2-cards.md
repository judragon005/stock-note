# 04 — 掛載 Row 2 卡片 (06 ~ 09)

**What to build:**
將 `TermTooltip` 掛載至 Row 2 卡片：
1. **06 累積型 AI 預測路徑圖 (`ForecastConeCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 上漲機率、震盪機率、下跌機率。
   - 年化漂移與預測錐體路徑（多方路徑/震盪路徑/空方路徑）。
   - 帶入動態上漲/下跌機率診斷多空方向。
2. **07 主力成本結構分布圖 (`VwapCostStructureCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 20日 VWAP（主力平均成本）。
   - 核心成本、倉位成本、成本偏離乖離度（帶入即時乖離率多空評估）。
3. **08 法人行為計量 (`InstitutionalFlowCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 外資、投信、自營商、三大法人合計。
   - 近 20 日累計買賣超與近 5 日累計買賣超（土洋合買/土洋齊賣診斷）。
4. **09 隔日沖風險分析 (`DayTradeRiskCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 主力賣出異常、籌碼過手率、沖銷比例、隔日回檔風險、日內波動率。
   - 隔日沖風險等級與風險指數（帶入高沖銷比例開高防禦診斷）。

**Blocked by:** 03-mount-header-and-row1-cards

**Status:** completed

- [x] Card 06 預測機率與漂移掛載 Tooltip
- [x] Card 07 VWAP 主力成本與波形堆疊成本段掛載 Tooltip
- [x] Card 08 三大法人進出與累計買賣超掛載 Tooltip
- [x] Card 09 隔日沖 5 大指標與風險評估掛載 Tooltip
- [x] 既有單元測試綠燈驗證
