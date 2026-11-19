# 13 — Zone 03 卡片精修 (Card 06 預測錐 / Card 07 VWAP / Card 08 法人 / Card 19 集保·13F / Card 20 營收·ETF)

**Parent:** #592 (Spec 0239)
**What to build:** 完整修復 Zone 03 五張圖表與大數據卡片並全面貫通美股模式：Card 06 (`ForecastConeCard`) 修復低價股 (`< $25`) Y 軸取整飛出畫布、圖例避開曲線、套用 `colorTheme` 與 `useId()` 並補 Empty State；Card 07 (`VwapCostStructureCard`) 移除寫死假 `'60k~0k'` Y 軸、讓圖例/語意/SVG 四帶填色 100% 對齊並呈現 `bands[].percentage`；Card 08 (`InstitutionalFlowCard`) 統一柱狀圖與折線 X 軸步距、動態防柱寬碰撞、移除 `preserveAspectRatio="none"` 與空陣列假字串 `'-64張/+1,621張'`、底部響應 `colorTheme`；Card 19 (`TdccDistributionCard`) 貫通美股真實 `us13fData`（含 >100% 結構條歸一防疊字與零假寬度）、台股 10 週 X 軸疏化與左軸 `>= 0`；Card 20 (`MonthlyRevenueCard`) 修復 `isEtf && isEmpty` 誤落入個股月營收框之漏洞、支援美股個股 10-Q/10-K 近 8 季營收柱圖與美股 ETF 美元 AUM/配息、修正單柱高度與單位自適應。
**Blocked by:** 05 — 台股歷史序列 (TDCC 10 週 / 月營收 12 月 / 歷史配息) 非阻塞按需補齊與自動重繪, 06 — 美股基本面與 13F 湖倉表 (us_fundamentals_daily)、Yahoo quoteSummary Crumb 聚合與美股歷史配息, 07 — SEC EDGAR 本地代理、全美股動態 CIK 解析與美股 10-Q/10-K 季營收貫通, 10 — [Expand] 全站 colorTheme/market 介面擴展、TaskViewsSwitcher 點擊死鎖修復與詞彙表補齊
**Status:** ready-for-agent

- [ ] 股價 `< $25` 的美股在 Card 06 正確繪製十進位自適應 Y 軸刻度（不算出 `0` 飛出畫布）、無長尾浮點數、圖例不遮曲線且隨 `colorTheme` 正確反轉上下軌色票。
- [ ] Card 07 不再顯示假 `'60k~0k'` 刻度，四組成本帶名稱/色塊/SVG 山峰填色 100% 一致並清楚渲染各帶佔比百分比。
- [ ] Card 08 在 `1~60` 筆歷史長度下柱狀圖與折線 X 軸對齊且不重疊、空歷史呈現 Honest Empty State 且不再將空資料染紅多頭色、底部總結響應 `colorTheme`、美股 `<5D` 維持美股視圖。
- [ ] Card 19 美股模式完整呈現 13F 機構/內部人/Short Float/軋空警示且 `inst + insider > 100%` 時長條不疊字；台股 10 週模式 X 軸日期不重疊且左軸 `>= 0`、掛載有效 `TermTooltip`。
- [ ] Card 20 當 `isEtf && isEmpty` 時顯示專屬 ETF 空狀態提示（絕不落入個股月營收視圖）；美股個股渲染近 8 季季營收與 YoY 柱圖；美股 ETF 正確以美元規模（`$B` / `億美元`）與 USD 配息呈現；台股小型股 Tooltip 不再顯示 `0.0 億`。
