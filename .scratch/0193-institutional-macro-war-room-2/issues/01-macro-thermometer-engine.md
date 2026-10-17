# 01 — 宏觀水溫計與建議總股票倉位上限合成 (Macro Thermometer)

**Parent:** #283

**What to build:**
提供 0~100 的綜合宏觀水溫計（Macro Thermometer）與三秒決策姿態，根據利率利差倒掛、VIX 恐慌指數、信用利差、外資期貨空單動態合成建議股票總倉位上限（例如 30%、50%、80%）與【進攻/平衡/防禦】作戰姿態。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `src/types/macro.ts` 定義 `MacroThermometer` 介面（包含 `score: number` 0~100, `stance: 'DEFENSIVE' | 'NEUTRAL' | 'AGGRESSIVE'`, `suggestedEquityAllocationPercent: number`, `rationale: string[]`）。
- [ ] `src/engine/macroAdvisorEngine.ts` 導出 `calculateMacroThermometer(macro: MacroIndicatorSnapshot): MacroThermometer`。
- [ ] 當殖利率倒掛且 VIX > 25 或信用利差飆升時，水溫計分數低於 40 分，判定為 `DEFENSIVE` 且總倉位上限不超過 40%。
- [ ] 當市場平穩無倒掛且 VIX < 18 時，水溫計分數高於 70 分，判定為 `AGGRESSIVE` 且建議倉位上限可達 70%~90%。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證不同市場情境之邊界數值、極值防禦（score 限制於 0~100 之間）。
