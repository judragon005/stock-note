# 04C — Card 21 虧損股 PS 切換與 ETF 折溢價率 (Premium %) 警戒自適應

**Parent:** #290

**What to build:**
於 `ValuationMetricsCard.tsx` 擴充邊界保護：
1. 當遇高成長虧損股 (PE 為負或無本益比) 時，第一格自適應切換為 PS (股價營收比)，避免破版報錯。
2. 當標的為 ETF 時，讀取 `etf_daily_nav` 資料表，自動切換為「即時折溢價率 (Premium %)」（溢價 > 0.5% 發出追價警戒）、年化殖利率與總費用率。

**Blocked by:** 04A

**Status:** completed

## Acceptance Criteria
- [x] 虧損標的自動以 PS 比替代 PE，畫面顯示虧損轉機期或營收估值。
- [x] ETF 標的顯示折溢價率；溢價 > 0.5% 時顯示紅色追價警示。
- [x] ETF 呈現費用率與年化配息率。
- [x] 單元測試通過。
