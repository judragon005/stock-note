# 07 — 提示詞注入【受控聯網獵犬協議 (Web Hunt Protocol)】

**What to build:**
在智策提示詞中注入受控聯網協議：當出現「待同步」欄位時授權外部 AI 聯網獵犬進行補全；但強制限定 4 大官方/權威白名單、自證 2026 年效期、嚴禁推翻本機價量均線（SSOT 原則），並強制將法人預估與官方實績隔離。

**Blocked by:** 06 — 提示詞注入【2026 時空對齊錨點】防退化指令

**Status:** ready-for-agent

- [ ] 在 `src/engine/strategicPromptEngine.ts` 新增受控聯網獵犬指令模組 `<web_retrieval_instructions>`。
- [ ] 納入白名單限制（MOPS、TWSE、TPEx、Yahoo 股市、權威財經日報）。
- [ ] 納入「禁止推翻本機現價均線與 VWAP」與「法人推估強制標註未實現」之硬性約束。
- [ ] 撰寫單元測試覆蓋提示詞聯網獵犬協議文本生成。
