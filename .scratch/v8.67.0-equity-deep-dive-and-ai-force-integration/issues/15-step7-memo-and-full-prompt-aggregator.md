# 15 — 步驟 7 投資筆記結構與 7 步全量 Prompt 聚合引擎

**What to build:** 
在 `src/engine/equityDeepDiveEngine.ts` 聚合步驟 1~6 之 Prompt 生成器，並實作步驟 7 交易卡結構範本：
1. 輸出 200 字極簡交易卡格式（買進理由、目標價、停損價、預計週期、3 大指標）。
2. 提供 `generateFull7StepsPromptPayload(input)`，將 7 個步驟合併為一份層次分明、排版優美、相容各大 LLM 之完整投研 Markdown 文本。

**Blocked by:** 09 — 步驟 1 商業模式與能力圈 Prompt 產生器, 10 — 步驟 2 財報魔鬼細節防雷 Prompt 產生器, 11 — 步驟 3 同業對照相對估值 Prompt 產生器, 12 — 步驟 4 市場沒說的事與處置警示 Prompt 產生器, 13 — 步驟 5 未來一年情境推演 Prompt 產生器, 14 — 步驟 6 籌碼微觀解讀 Prompt 產生器

**Status:** ready-for-agent

- [ ] 支援單步獨立 Prompt 產生與全量 7 步 Prompt 輸出
- [ ] 嚴格防禦空值，缺失數據時以範本引導提問
- [ ] 單元測試 100% 覆蓋
