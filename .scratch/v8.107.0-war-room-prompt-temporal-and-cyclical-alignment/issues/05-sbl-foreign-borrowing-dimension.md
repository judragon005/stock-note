# 05 — 台股籌碼外資借券賣出（SBL）維度擴充 (SBL Borrowing Dimension)

**Parent:** #288

**What to build:**
在 `src/engine/strategicPromptEngine.ts` 的 `<chips_and_microstructure>` 區塊追加 `<sbl_balance unit="${unit}">N/A (外資借券賣出待結算)</sbl_balance>` 與註解說明，標明台股外資主力空方部位以借券賣出為主，不能單憑融券餘額斷定市場無放空賣壓。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] 非美股標的之 `<chips_and_microstructure>` 輸出 `<sbl_balance unit="${unit}">` 欄位與說明。
- [x] `src/engine/strategicPromptEngine.test.ts` 驗證台股標的包含借券賣出欄位，美股標的維持隔離不輸出。
