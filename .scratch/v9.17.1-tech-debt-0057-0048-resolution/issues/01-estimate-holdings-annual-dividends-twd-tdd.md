# 01 — 股息現金活水估算純函式 TDD 實作 (estimateHoldingsAnnualDividendsTwd)

**What to build:** 在 `src/engine/zavySlowWealthEngine.ts` 實作具備平倉過濾、USD/TWD 匯率換算與防禦性 4.5% 底標的純函式 `estimateHoldingsAnnualDividendsTwd`，並透過 TDD 單元測試確保 100% 邊界覆蓋。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] `estimateHoldingsAnnualDividendsTwd` 支援空持股或無效資料時安全回傳 0
- [x] 支援平倉標的過濾 (`isClosed: true` 或 `shares <= 0` 不計入股息)
- [x] 支援台幣與美股標的匯率換算 (`currency === 'USD'` 乘上 `usdToTwdRate`)
- [x] 具備成本殖利率判定：若未提供或非正數則套用 4.5% 防禦性底標
- [x] 在 `src/engine/zavySlowWealthEngine.test.ts` 新增涵蓋上述邊界條件之單元測試並 100% 通過
