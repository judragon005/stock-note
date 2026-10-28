# 01 — 美股加權成本匯率與累計報酬率分母重構 (Weighted Cost FX & Invested Cost Denominator)

**What to build:**
美股持股成本匯率由 `historicalFx` 加權精確推導，徹底移除寫死的 `32.0`。累計總報酬率分母統一改採歷史累計總投入本金 (`historicalTotalInvestedCost`)，徹底解決已平倉股票回報率 0.00% 及微量零股分母失真問題。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 美股不同買進日期具不同匯率時，成本匯率呈現加權平均值而非 32.0
- [x] 已平倉個股（在倉 0 股）能正確計算並顯示實現總報酬率 %，不再顯示 0.00%
- [x] 賣出 99% 持股僅留 1 股零股時，未實現報酬率與累計總報酬率分母不產生畸變
