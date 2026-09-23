# 02 — 股息貢獻排行榜嚴格入帳過濾與分子分母口徑同步 (Contributor Ranking & Settled Gate)

**What to build:**
1. 重構 `src/engine/dividendAggregator.ts` 中的股息貢獻排行榜累計機制：
   - 全歷史 Top 貢獻榜：分子累加強制限制 `effectivePayDate <= currentDateStr`，與分母 `totalHistoricalDividendsTWD` 口徑 100% 同步。
   - 當年度 Top 貢獻榜：分子累加強制限制 `effectivePayDate.startsWith(currentYearStr)` 且 `effectivePayDate <= currentDateStr`，與當年度實領分母 100% 同步。
2. 消除幽靈未到期款項：
   - 阻斷未到期發放之預約除息提前污染排行榜名次。
   - 保證個股貢獻百分比之計算基準真實且加總不失真。

**Blocked by:** Ticket 01

**Status:** closed
- [x] 全歷史貢獻榜累計加入 `isSettled` (`effectivePayDate <= currentDateStr`) 閘門
- [x] 當年度貢獻榜累計加入 `isSettled` 閘門
- [x] 驗證排行榜分子分母同步且排序確定性 (Deterministic Sorting)
