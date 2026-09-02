# 05 — 每日持股重播與 NAV 總報酬計算核心 (Daily Portfolio Replay & NAV Series Engine)

**What to build:** 實作核心 `calculateHistoricalNavSeries` 回測重播演算法。按日迭代計算：各標的每日持有股數（自動還原分割、減資、配股）、當日持股市值（股數 × 歷史收盤價 × 歷史匯率）、當日總資產淨值（持股市值 + 現金餘額 - 借貸負債）、當日累計投入本金，以及累計總報酬率與當日事件摘要。

**Blocked by:** 03 — 歷史日 K 與匯率增量抓取器, 04 — 現金帳本與借貸負債異動引擎

**Status:** ready-for-agent

- [ ] 實作 `calculateHistoricalNavSeries(trades, cashEntries, loans, priceHistoryMap, fxHistoryMap)` 核心回測函式
- [ ] 支援股票分割、除權配股、減資退款與現金增資等公司行動之每日持股與市值動態重播
- [ ] 整合多幣別美股與台股統一折算為基準幣別 (TWD / USD)
- [ ] 撰寫完整單元測試覆蓋多帳戶、多幣別、全歷史事件序列，`npm test` 100% 通過
