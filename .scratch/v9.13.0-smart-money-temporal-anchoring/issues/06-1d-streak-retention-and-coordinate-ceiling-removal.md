# 06 — 1D 模式 Streak 連買天數與坐標截斷貼頂修復

**Parent:** #433 (Spec 0218)
**GitHub Issue:** #439 (CLOSED)

**What to build:**
1. `src/engine/chipsAggregator.ts` 在 1D 模式穿透歷史數列計算真實連買連賣天數。
2. `src/engine/smartMoneyEngine.ts` 移除除以 2500 之坐標壓扁與天花板截斷。

**Acceptance Criteria:**
- [x] 1D 當日模式下 Streak 不被截斷為 1。
- [x] 大買賣超標的維持非線性動能映射，杜絕貼頂。
- [x] 單元測試 100% 通過。
