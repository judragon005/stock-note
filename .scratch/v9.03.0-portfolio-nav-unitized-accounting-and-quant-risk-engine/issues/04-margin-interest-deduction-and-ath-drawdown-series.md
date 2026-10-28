# 04 — 信用交易融資賣出利息扣除與逐日水下深度計算

**What to build:**
補齊信用交易會計漏洞：在融資賣出（`MARGIN_SELL`）平倉時，依據買入日與賣出日間隔天數、融資年利率試算並自淨變現所得中精確扣除融資利息，避免平倉變現金額被虛高抹去。同時在逐日快照推演中，追蹤歷史累計最高淨值（All-Time High, ATH），並計算當日水下回撤百分比 (`underwaterDrawdownPercent`)，為後續水下回撤圖與風控警示提供標準數據層。

**Blocked by:** Ticket 02

**Status:** ready-for-agent

- [ ] 擴充 `src/types/stock.ts` 中 `PortfolioDailySnapshot` 新增 `underwaterDrawdownPercent?: number` 欄位
- [ ] 在 `historicalNav.ts` 中融資賣出結算時，扣除持股期間融資利息：`FinancingInterest = DebtAmount * Rate * (HoldDays / 365)`
- [ ] 在狀態機中維護 `peakUnitNAV`，計算當日水下百分比：`underwaterDrawdownPercent = ((peakUnitNAV - currentUnitNAV) / peakUnitNAV) * 100`
- [ ] 於 `src/engine/__tests__/historicalNav.test.ts` 驗證融資平倉真實扣息與水下回撤數列正確性
