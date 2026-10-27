# 07 — 補齊 LLM Payload 法人欄位與 CRO 提示詞協議 (LLM Payload CRO System Prompt Expansion)

**Parent:** Spec 0204 (Ticket 07)

**What to build:**
修正 `src/engine/macroAdvisorEngine.ts` 中的 `buildLlmPromptPayload`。目前該函式遺漏了 Spec 0193 新增的高收益債信用利差（OAS）、CDS 指數、外資台指期未平倉口數、融資維持率、1-Day 95% VaR、美股匯率 Delta 與 3 階壓力測試矩陣，且缺少 System Prompt 約束。重構為完整導出所有法人風控指標，並包裝專業避險基金 CRO (Chief Risk Officer) 指令集與封閉基準日宣告。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] `buildLlmPromptPayload` 導出的 JSON 物件包含：
  - `macro`: 包含 `creditSpreadOAS`, `cdsInsuranceIndex`, `cdsRiskLevel`, `twFuturesNetOi`, `twMarginMaintenance`。
  - `portfolio`: 包含 `valueAtRisk95TWD`, `varRatioPercent`, `fxDeltaTWD`, `quickStressTest` 矩陣。
  - `holdingRisks`: 輸出在線標的代碼、權重%、損益%、獨立三日箱底。
- [ ] 輸出字串在頂部包裝 Agentic System Prompt：
  指定外部 AI 扮演避險基金風控長（CRO），聲明此為封閉基準日模型數據，要求針對破線持股與黑天鵝壓力情境進行嚴格審查，停止質疑歷史時效。
- [ ] 單元測試 `src/engine/macroAdvisorEngine.test.ts` 驗證導出的 JSON 包含所有法人欄位，無 `undefined` 遺漏。
