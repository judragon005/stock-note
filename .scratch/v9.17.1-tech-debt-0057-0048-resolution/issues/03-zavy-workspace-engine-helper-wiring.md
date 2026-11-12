# 03 — Zavy 工作區渲染層拔除 inline 計算改委託純函式

**What to build:** 在 `src/components/zavy/ZavySlowWealthWorkspace.tsx` 拔除渲染層 inline 的 `holdings.reduce` 計算，改為委託調用 `estimateHoldingsAnnualDividendsTwd`，徹底消除 Feature Envy 業務邏輯外溢氣味。

**Blocked by:** 01 — 股息現金活水估算純函式 TDD 實作 (estimateHoldingsAnnualDividendsTwd)

**Status:** ready-for-agent

- [x] 移除 `ZavySlowWealthWorkspace.tsx` 第 139～148 行的 inline `holdings.reduce`
- [x] 引入並調用 `estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate)`
- [x] 確保 `analysisReport` useMemo 的運算結果與原邏輯 100% 一致，零破壞性回歸
