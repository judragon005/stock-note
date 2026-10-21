# 03 — 提示詞時態因果隔離與 N/A 待同步免責宣告 (Temporal & Pending Grounding Declarations)

**Parent:** #288

**What to build:**
在 `src/engine/strategicPromptEngine.ts` 的 `<system_grounding_declaration>` 注入兩項強制聲明，防止外部 AI 風控因果顛倒或過度恐慌：
1. 【時態因果隔離】：現價為盤中即時行情，三大法人與融資券為前一交易日盤後結算數據，嚴禁將前一日籌碼因果直接套用於盤中即時走勢。
2. 【待同步宣告】：若部分財務估值（PE/PB）或公司治理指標標註為 N/A，係因當前系統管線尚待同步，嚴禁直接推定為公司財務舞弊或無價值。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] `buildTemporalGroundingXml` 包含 `【時態因果隔離】` 強制宣告。
- [x] `buildTemporalGroundingXml` 包含 `【待同步宣告】` 免責聲明。
- [x] `src/engine/strategicPromptEngine.test.ts` 驗證宣告字串完整渲染於輸出提示詞中。
