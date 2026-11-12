# 06 — `DividendCalendarCard.tsx` 12個月預估月曆、生活費對標與 Zavy 活水轉向

**What to build:**
將 12 個月現金流預估月曆抽出為獨立子組件 `DividendCalendarCard.tsx`，加入每月 35,000 元生活開銷覆蓋率與枯水期警報，並在卡片底部串接 `zavySlowWealthEngine` 股息活水轉向指引（00687B / 00635U）。

**Blocked by:** 01 — ETF 分流推估 (+23天/+28天) 與「一鍵已入帳」資料流, 02 — YOC (成本殖利率) 與實質填息/貼息標籤計算模組

**Status:** ready-for-agent

- [ ] 獨立抽出 `src/components/dividend/DividendCalendarCard.tsx`。
- [ ] 支援生活費對標線、枯水期斷糧警示與月均覆蓋率 % 計算。
- [ ] 底部整合 Zavy 股息活水轉向公債/黃金指引卡。
- [ ] 單元測試驗證月曆各月份現金流與展開折疊狀態。

