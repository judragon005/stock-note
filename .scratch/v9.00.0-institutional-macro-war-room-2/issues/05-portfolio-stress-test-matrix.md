# 05 — 個人防護盾之 3 階急速黑天鵝壓力測試矩陣

**Parent:** #283

**What to build:**
提供 `[-10%] 震盪`、`[-20%] 回檔`、`[-30%] 崩盤` 3 階急速壓力測試純數學試算矩陣，即時推估在大盤急跌時，投資人的質押維持率跌至幾%、以及觸發追繳（130%）時需補繳之保證金缺口。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 擴充 `MacroPortfolioShield` 定義 `QuickStressScenario` 與 `quickStressTest` 陣列。
- [ ] `src/engine/macroAdvisorEngine.ts` 導出 `calculateQuickStressMatrix(collateralTWD: number, totalLoanDebtTWD: number): QuickStressScenario[]`。
- [ ] 針對 -10%、-20%、-30% 跌幅精算壓力後擔保品市值、新維持率與追繳保證金缺口（Shortfall = `Math.max(0, totalLoanDebt * 1.3 - stressedCollateral)`）。
- [ ] 當 `totalLoanDebtTWD === 0` 時，優雅回傳安全預設狀態，維持率維持 999.9% 且缺口為 0。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證維持率與追繳金額計算正確無誤。
