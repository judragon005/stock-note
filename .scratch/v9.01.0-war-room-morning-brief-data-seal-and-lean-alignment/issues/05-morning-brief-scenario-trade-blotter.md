# 05 — 晨報 45%/50%/54% 情境調倉減碼金額試算 (Morning Brief Scenario Trade Blotter)

**Parent:** Spec 0204 (Ticket 05)

**What to build:**
升級 `src/engine/macroAdvisorEngine.ts`。先前晨報只輸出「建議股票倉位上限 50%」的抽象口號，外部 AI 因缺少金額與權重無法給出具體應賣張數。重構為比對在倉股票總市值與水溫計上限，自動試算超配需降低之股票額度 $\Delta \text{TWD}$，在今日執行要點中明確產出具體可下單的「情境調倉目標」。

**Blocked by:** Ticket 04

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] 在 `generateAiMorningBrief` 中，以傳入的 `shield.totalNavTWD` 與 `holdingSignals` 的市值加總算出：
  - 當前股票總市值 `currentEquityTWD = sum(s.marketValueTWD)`。
  - 當前股票實質佔比 `currentEquityRatioPercent = Math.round((currentEquityTWD / shield.totalNavTWD) * 1000) / 10`。
- [ ] 若 `currentEquityRatioPercent > macroThermometer.suggestedEquityAllocationPercent`：
  - 計算需降低之股票額度：
    $$\Delta \text{TWD} = \text{currentEquityTWD} - \text{shield.totalNavTWD} \times \frac{\text{suggestedEquityAllocationPercent}}{100}$$
  - 在行動要點追加：
    `📌【情境調倉目標】當前股票水位約 ${currentEquityRatioPercent}% (約 NT$ ${currentEquityTWD萬})，若降至 ${suggestedEquityAllocationPercent}% 防禦上限，需降低股票額度約 NT$ ${Math.round(deltaTWD).toLocaleString()}；優先自 P1 週期敏感標的檢核減碼。`
- [ ] 若當前股票佔比未超標，不輸出減碼金額指令。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證不同倉位情境下的算術減碼金額。
