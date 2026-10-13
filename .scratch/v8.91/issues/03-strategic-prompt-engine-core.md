# 03 — 雙軌路由與六頂思考帽組裝引擎核心 (Ticket 03)

**Parent Issue:** #135
**Parent Spec:** [Spec 0153: 智策精煉投資決策多維提示詞引擎與工作區數據注入生成器規格書](file:///d:/APP/股票紀錄/docs/specs/0153-smart-strategic-prompt-engine-and-workspace-generator-spec.md)
**Parent ADR:** [ADR 0153: 智策精煉投資決策多維提示詞引擎架構規劃](file:///d:/APP/股票紀錄/docs/adr/0153-smart-strategic-prompt-engine.md)

**What to build:**
建立 `src/engine/strategicPromptEngine.ts` 與 `src/engine/strategicPromptEngine.test.ts`：
1. **資產類別自適應雙軌路由 (`isEtfSymbol`)**：
   - 若為普通個股：組裝《個股大師 V12.0》架構（宏觀 WACC、好生意 CR4/CR8、好公司護城河/三大報表、好價格 VWAP）。
   - 若為 ETF：組裝《ETF 大師 V3.0》架構（動態權重感知、指數品質、費用效率 TER/TD、穿透式 Look-Through）。
2. **六頂思考帽組裝模組 (`buildSixHatsPromptSection`)**：
   - ⚪ 白帽：客觀事實數據。
   - 🔴 紅帽：市場情緒與群眾恐慌直覺。
   - ⚫ 黑帽：魔鬼代言人/紅隊批判（致命弱點與破位點）。
   - 🟡 黃帽：核心價值與催化劑。
   - 🟢 綠帽：非對稱創新策略。
   - 🔵 藍帽：元認知與風控執行紀律。
3. **語意 XML 外框封裝與 Agentic 反思閘門**：
   - 封裝 `<system_role>`、`<data_customs_audit>`、`<fact_sheet>`、`<investor_context>`、`<six_thinking_hats_instruction>`、`<agentic_reflection_gate>`、`<output_format>`。
4. **單維度抽離與 Master 全量導出**：
   - 支援 `generateMasterPrompt()`。
   - 支援 `generateSingleHatPrompt(hat)`。
   - 實測 Token 守門：單帽 < 1,200 tokens，Master < 4,500 tokens。

**Blocked by:** Ticket 02 (特徵壓縮層)

**Status:** ready-for-agent

- [ ] `strategicPromptEngine.ts` 實作完成。
- [ ] `strategicPromptEngine.test.ts` 100% 綠燈，包含：
  - 個股與 ETF 自動路由驗證。
  - 六頂思考帽獨立章節與 Master 完整輸出。
  - Token 嚴格小於 4,500 tokens 斷言。
  - 脫敏模式與個人持倉隱私保護斷言。
