# 02 — 盤中即時成交量回退與量價一致性護欄 (Intraday Volume-Price Consistency)

**Parent:** #288

**What to build:**
在 `src/engine/aiForcePromptAdapter.ts` 構建 `StrategicFactDigest` 時，加入盤中未結算成交量防禦：若 `report.marketBar?.volumeShares` 為 0 或未定義，而 `report.realtimeQuote?.volume` 大於 0 時，優先採計即時累計成交量（台股換算為張數），確保在現價有跳動時，`<volume_shares>` 必定大於 0，消除量價矛盾。

**Blocked by:** None — can start immediately

**Status:** completed

## Acceptance Criteria
- [x] `createWarRoomPromptDigest` 萃取 `volumeShares` 時：
  - 若 `report.marketBar?.volumeShares` 大於 0，採計該值；
  - 若其為 0 或 undefined，而 `(report as any).realtimeQuote?.volume` 大於 0，則優先採計即時累計成交量（台股換算為張數）；
  - 保證當現價存在且有跳動時，若有即時成交量，Prompt 成交量必定大於 0。
- [x] `src/engine/aiForcePromptAdapter.test.ts` 涵蓋盤中未結算且 `volumeShares` 為 0/undefined 時的回退驗證。
- [x] 成交金額估算（億元）同步依據正確成交量計算。
