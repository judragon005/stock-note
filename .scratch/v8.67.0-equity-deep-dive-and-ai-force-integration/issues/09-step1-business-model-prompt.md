# 09 — 步驟 1 商業模式與能力圈 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep1BusinessModelPrompt(symbol, name, market)`。
生成要求 AI 以 500 字白話拆解該公司之商業模式的 Prompt，涵蓋：
1. 公司靠什麼賺錢（主要產品與營收佔比）。
2. 主要客戶群與市場分佈。
3. 產業鏈上下游位置與定價權。
4. 核心護城河（技術、專利、規模、網路效應）。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析

**Status:** ready-for-agent

- [ ] 自動帶入標的代碼、名稱與所屬市場
- [ ] 輸出排版整潔之 Markdown 提示詞字串
- [ ] 單元測試 100% 覆蓋
