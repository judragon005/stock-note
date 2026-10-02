# 11 — 步驟 3 同業對照相對估值 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep3PeerComparisonPrompt(symbol, name, market)`。
要求 AI 列出 2 檔最直接之競爭對手（同產業國內或跨國競對），並橫向比較：
1. 近四季毛利率與營益率高低。
2. 預估本益比 (Forward PE) 與股價淨值比 (PB)。
3. 現金殖利率與資本支出強度。
破除「單看這檔股票 500 元好貴、那檔 30 元好便宜」之價格偏誤。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析

**Status:** ready-for-agent

- [ ] 支援同業對照表格結構化 Prompt 輸出
- [ ] 提示 AI 鎖定實質競爭對手而非泛泛之大盤指數
- [ ] 單元測試 100% 覆蓋
