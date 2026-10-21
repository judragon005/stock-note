# 04 — 個人防護盾之 1-Day 95% 在險價值 (VaR) 與匯率敏感度 (FX Delta)

**Parent:** #283

**What to build:**
個人防護盾擴充法人風控標準之單日 95% 在險價值（1-Day 95% Value at Risk），依據歷史年化波動度與 NAV 秒算 95% 信心水準下的單日最大潛在損失金額；同時計算美股持倉在台幣升貶 1 元時之 FX Delta 損益敏感度。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 擴充 `MacroPortfolioShield`：
  - `valueAtRisk95TWD?: number` (單日 95% 在險價值，TWD)
  - `varRatioPercent?: number` (VaR 佔淨值百分比 %)
  - `fxDeltaTWD?: number` (台幣每升值 1 元之美股淨值變動額，TWD)
- [ ] `src/engine/macroAdvisorEngine.ts` 實作 `calculate1DayVaR95(navTWD: number, annualizedVolatility: number = 0.18): number`，公式遵循 $$1.65 \times \frac{\sigma}{\sqrt{252}} \times \text{NAV}$$。
- [ ] `src/engine/macroAdvisorEngine.ts` 實作 `calculateFxDelta(usStockValueUSD: number): number`。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證零 NAV、負 NAV 防禦、正常 NAV 下的數值精確度與四捨五入。
