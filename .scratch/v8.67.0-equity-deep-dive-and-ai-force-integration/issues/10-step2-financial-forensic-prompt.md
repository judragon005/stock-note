# 10 — 步驟 2 財報魔鬼細節防雷 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep2FinancialForensicPrompt(symbol, name, quoteValuation)`。
要求 AI 檢驗最新財報三大背離異常點：
1. 營收成長與營業現金流背離（是否有獲利無現金之假成長）。
2. 應收帳款與存貨周轉天數是否急遽拉長。
3. 毛利率與營業利益率走勢是否遭同業侵蝕。
自動代入已知之 PE、PB、殖利率作為客觀輸入基準。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析

**Status:** ready-for-agent

- [ ] 自動填充已知估值數據
- [ ] 產生防範地雷股之針對性財務質疑 Prompt
- [ ] 單元測試 100% 覆蓋
