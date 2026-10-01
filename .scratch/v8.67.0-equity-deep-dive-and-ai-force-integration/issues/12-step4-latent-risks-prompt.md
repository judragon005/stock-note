# 12 — 步驟 4 市場沒說的事與處置警示 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep4LatentRisksPrompt(symbol, name, statusTag, market)`。
結合 Ticket 04 之處置/注意警示標籤，生成深度風險審視 Prompt：
1. 若該標的處於處置中 (`DISPOSITION`)，強制要求分析流動性受限與分盤撮合衝擊。
2. 若處於注意中 (`ATTENTION`)，要求分析追價熱度與短線過熱風險。
3. 提示市場主流定價外之潛在黑天鵝（單一客戶集中度 > 30%、美中地緣政治、外匯避險缺口）。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析, 04 — 主力戰情室端到端處置徽章注入與真實連動 E2E

**Status:** ready-for-agent

- [ ] 自動將處置/注意警示狀態動態注入 Prompt
- [ ] 提示美股標的分析 SEC 風險與海外市場暴露
- [ ] 單元測試 100% 覆蓋
