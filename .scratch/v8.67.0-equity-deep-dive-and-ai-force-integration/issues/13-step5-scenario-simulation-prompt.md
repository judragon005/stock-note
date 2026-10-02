# 13 — 步驟 5 未來一年情境推演 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep5ScenarioSimulationPrompt(symbol, name, currentPrice)`。
要求 AI 建立未來一年 3 套情境劇本：
1. **樂觀情境 (Bull Case)**：核心產品超預期放量，給出營收成長率、毛利率、EPS 與合理目標價。
2. **中性基準 (Base Case)**：依循目前市場共識之合理估值價位。
3. **悲觀防守 (Bear Case)**：景氣下行或大客戶砍單時，給出防守支撐底線。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析

**Status:** ready-for-agent

- [ ] 自動代入最新現價作為基準參考點
- [ ] 規範三套劇本必須輸出具體價格區間而非模糊形容詞
- [ ] 單元測試 100% 覆蓋
