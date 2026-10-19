# 04 — 在庫持倉停損防線實質觸發狀態前置預算 (Deterministic Stop-Loss Status)

**Parent:** #288

**What to build:**
在 `src/engine/strategicPromptEngine.ts` 的 `<pre_calculated_pivots mode="HOLDING_DEFENSE">` 中，由引擎自動比對現價與保守 3% 停損線，輸出確定性布林狀態標籤 `<stop_loss_conservative_status is_triggered="true|false">`，輔助外部 AI 風控長給出無爭議的執行指令，杜絕模棱兩可的空話。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 當 `isInPosition` 為 true 時：
  - 若 `currentPrice < pivots.stopLossConservative3Pct`，輸出 `<stop_loss_conservative_status is_triggered="true">已實質跌破保守停損線 (觸發紀律防守條件)</stop_loss_conservative_status>`；
  - 若 `currentPrice >= pivots.stopLossConservative3Pct`，輸出 `<stop_loss_conservative_status is_triggered="false">位於防線之上安全</stop_loss_conservative_status>`。
- [x] `src/engine/strategicPromptEngine.test.ts` 驗證跌破停損線與高於停損線之兩種情境。
