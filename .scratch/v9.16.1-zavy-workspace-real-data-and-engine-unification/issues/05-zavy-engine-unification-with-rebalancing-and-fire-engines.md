# 05 — Zavy 決策引擎去偽存真與既有引擎統一 (rebalancingEngine + monteCarloFireEngine)

**Parent:** [#478](https://github.com/judragon005/stock-note/issues/478)

**What to build:**
重構 `zavySlowWealthEngine.ts`：移除 `(usPmi + twPmi) / 2` 算術平均與假信心度，改為客觀呈現台美擴散/新訂單動能與信貸裂痕；落底核對表直接連通動態傳入的布林下軌與利空鈍化標記；砍掉重複加總與寫死的 `currentEquityWeightPercent: 80` / `usdToTwdRate = 32` / 固定 25 年折現，改為直接委託呼叫專案內現成的 `calculateAssetClassRebalancePlan`（真實質押還款建議、含 `🔒` 設質鎖定的四階減碼瀑布流、真實股息導流計畫）與 `calculateSlowWealthFireMetrics`（30x 退休進度、Coast-FIRE 與順序風險雙軌對比）。

**Blocked by:** [#480](https://github.com/judragon005/stock-note/issues/480) (Ticket 02), [#482](https://github.com/judragon005/stock-note/issues/482) (Ticket 04)

**Status:** ready-for-agent

- [ ] 在 `evaluateMacroCompass` 中移除 `(usPmi + twPmi) / 2` 與假信心度 `confidenceScore`，改為依據真實營收擴散/ISM 指標與信貸裂痕判定週期階段
- [ ] 擴充 `generateZavyAnalysisReport` 接收參數：`usdToTwdRate`、`loans`（`LoanRecord[]`）、`annualEstimatedDividendsTwd`、`isAtBollingerLowerBand`、`isBadNewsDivergenceObserved`、`stressScenarioDrawdownPercent`
- [ ] 在 `generateTrackADecision` 中，直接呼叫 `calculateAssetClassRebalancePlan` 取得真實當前股票佔比（取代寫死 80%）、股票質押還款建議 `debtRepayment` 與包含 `🔒` 設質鎖定的四階減碼瀑布流 `waterfallSellSuggestions`
- [ ] 在 `generateTrackBDecision` 中，直接呼叫 `calculateAssetClassRebalancePlan` 與 `calculateSlowWealthFireMetrics`，產生真實的股息活水導流分配金額與 30 倍年支出 / Coast-FIRE / 前 10 年順序風險破產率對比
- [ ] 編寫單元測試覆蓋質押帳本連動、設質鎖定防呆、真實匯率換算與動態布林/利空鈍化之落底核對表計算

