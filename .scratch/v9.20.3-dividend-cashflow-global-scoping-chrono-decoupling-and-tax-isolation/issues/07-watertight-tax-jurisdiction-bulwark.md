# 07 — 法定跨境稅制水密艙隔離 (Watertight Tax Jurisdiction Bulwark)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `aggregateDividendReport` 聚合回傳結構中獨立統計中華民國境內公司分配之股利 `currentYearTwDividendsTWD`（扣繳代碼 54C），並在 `DividendLogView` 中將境內股利總額專供 `calculateDividendTaxDeductionStats` 使用。嚴格遵守台灣所得稅法 8.5% 股利抵扣額（上限 8 萬）規範，物理水密隔離美股 30% 海外所得（最低稅負制），杜絕境外股利所得違規侵蝕台灣本土抵扣額。

**Blocked by:** 06 — SSOT 應收股利與月度長條圖數據同源融合

**Status:** ready-for-agent

- [ ] 在 `DividendSummaryReport` 型別與 `aggregateDividendReport` 實現中增加 `currentYearTwDividendsTWD`
- [ ] 僅累計 `market === 'TW'` 且實質入帳於當年度之台股股利交易
- [ ] 在 `DividendLogView` 中將 `taxStats` 的計算輸入改用 `report.currentYearTwDividendsTWD`
- [ ] 更新 `src/engine/dividendAggregator.test.ts` 與 `src/components/DividendLogView.test.ts` 驗證美股海外所得零污染
