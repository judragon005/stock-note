# 14 — Layer 6 卡片精修與孤兒元件收斂 (Card 10·13 能量情緒 / Card 12 動態信號 / Card 14 AI 信心 / Card 21 估值矩陣)

**Parent:** #592 (Spec 0239)
**What to build:** 完整修復 Layer 6 四大關鍵卡片並收斂歷史孤兒元件：Card 10·13 (`EnergySentimentTwinCard`) 嚴格依 `market === 'US'` 切換視圖（徹底終結台股遭劫持）、解除 `overflow: hidden` 裁切、響應 `colorTheme`、補齊 `asOfDateText` 與 `trustFuturesOi` 並修正「台股市場合情緒」錯字；收斂清理已淘汰的 `BullBearEnergyCard` 與 `MarketSentimentCard` 消除色彩極性衝突與欄位名漂移；Card 12 (`DynamicSignalsCard`) 修正 `'風險可控'` 綠燈映射、全數消除 `0.7rem` 低於底線字級、修正錯字並去重重複標籤；Card 14 (`AiConfidenceCard`) 改標「訊號穩定度」、加上 `0~100` clamp 與完整 `TermTooltip`；Card 21 (`ValuationMetricsCard`) 完整呈現美股 `PE/Forward PE/PB/PS/30% 稅後殖利率`（修正 `isLoss` 與 `isUs` 優先序）、美股 EPS 改 `$` 單位、於歷史估值帶加入 PR 分位視覺落點指針、無樣本或 ETF 不亮假「合理區間」條、補納 `operatingMargin` 檢查、掛載 `psRatio`/`etfDiscountPremium` Tooltip 並移除頁尾內部表名。
**Blocked by:** 06 — 美股基本面與 13F 湖倉表 (us_fundamentals_daily)、Yahoo quoteSummary Crumb 聚合與美股歷史配息, 07 — SEC EDGAR 本地代理、全美股動態 CIK 解析與美股 10-Q/10-K 季營收貫通, 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊
**Status:** ready-for-agent

- [ ] 台股標的具備湖倉總經資料時，Card 10·13 100% 呈現台股情緒與衍生品數據（P/C 比、外資/投信期貨未平倉），且不再因 `overflow: hidden` 裁切底部；美股呈現 CNN/VIX/10Y 與基準日；多空能量條與數值嚴格響應 `colorTheme`。
- [ ] `BullBearEnergyCard` 與 `MarketSentimentCard` 完成收斂或對齊單一色彩/欄位契約（`vix`/`vixValue`、`tenYearTreasury`/`us10yYield`、消除 `{ratio} 倍多` 與綠多紅空倒置），所有相關單元測試全綠。
- [ ] Card 12 `'風險可控'` 顯示綠燈、0 處字級 `< 0.75rem`、無 `'波動高特偏高'` 錯字、美股不顯示台股處置/融資詞彙；Card 14 顯示「訊號穩定度」且全項附帶 `TermTooltip`。
- [ ] Card 21 對美股虧損配息股仍正確呈現扣除 30% 預扣稅後實質殖利率、美股 EPS 顯示 `$` 而非「元」、歷史分位條可見精準 PR 落點指針、ETF 或 `historySampleSize < 5` 時不點亮假估值區間條、頁尾不洩漏 `etf_daily_nav` 內部表名。
