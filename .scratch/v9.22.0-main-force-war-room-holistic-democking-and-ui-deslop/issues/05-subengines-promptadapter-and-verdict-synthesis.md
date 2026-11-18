# Issue 05: 子引擎修復、提示詞轉接器時序對齊與 MLP 主力語意接線

- **層級**: 計算引擎 / AI 智策
- **關聯規格**: Spec 0237 Ticket 5 / Parent Issue #588
- **狀態**: Completed

## 任務目標
1. 於 `src/engine/aiForcePromptAdapter.ts` 修正讀取 TDCC 10 週前最舊紀錄與 `twPutCallRatio` 斷路。
2. 連通 `src/engine/mainForceVerdictEngine.ts` 之 `synthesizeMainForceVerdict`，輸出真實主力作戰語意與動態停損停利乘數。
3. 計算三大法人連買連賣天數（`foreignConsecutiveDays`、`trustConsecutiveDays`）。
