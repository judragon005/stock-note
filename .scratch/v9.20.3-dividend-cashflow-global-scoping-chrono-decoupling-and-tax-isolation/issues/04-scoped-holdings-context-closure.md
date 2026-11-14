# 04 — 全域持股同態幾何收縮中樞 (Scoped Holdings Context Closure)

**Parent:** https://github.com/judragon005/stock-note/issues/542

**What to build:**
在 `DividendLogView` 頂層建立 `scopedHoldings` 記憶化過濾陣列，依據使用者的 `market` 與 `selectedAccountId` 進行同態收縮，並將其傳入 `generate12MonthProjectedCashflow`、`DividendTopContributorsCard` 與 `DividendHistoryTable`。徹底消除未經過濾的原始全量 `holdings` 裸傳問題，確保切換至美股市場時，台股持股 100% 被水密排除。

**Blocked by:** 01 — 歷史發放月時序因果屏障門禁

**Status:** ready-for-agent

- [ ] 在 `DividendLogView` 宣告 `scopedHoldings`，按 `market` 與 `selectedAccountId` 過濾 `holdings`
- [ ] 將 `generate12MonthProjectedCashflow` 的輸入改由 `scopedHoldings` 提供
- [ ] 將 `DividendTopContributorsCard` 的持股輸入改由 `scopedHoldings` 提供
- [ ] 驗證切換為美股時，預測日曆與貢獻榜 100% 不出現台股標的與幽靈現金流
- [ ] 更新 `src/components/DividendLogView.test.ts` 相關市場隔離測試
