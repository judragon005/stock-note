# 14 — 步驟 6 籌碼微觀解讀 Prompt 產生器

**What to build:** 
在 `src/engine/equityDeepDivePrompts.ts` 實作 `buildStep6ChipsAnalysisPrompt(symbol, name, chipsData)`。
注入 Ticket 07/08 裝配出之近 20 日法人籌碼累計與箱體防線：
1. 分析外資、投信、自營商籌碼動能與方向。
2. 研判目前處於「主力吃貨、震盪洗盤、推升進攻、出貨派發或籌碼沉澱」哪一階段。
3. 提示目前價格距離關鍵箱底（防守）與箱頂（突破）之空間幅度。

**Blocked by:** 08 — 台美雙市場動態適配器與美股替代籌碼分析

**Status:** ready-for-agent

- [ ] 自動代入裝配好的籌碼數值與箱體支撐位
- [ ] 美股標的引導分析價量背離與換手率
- [ ] 單元測試 100% 覆蓋
