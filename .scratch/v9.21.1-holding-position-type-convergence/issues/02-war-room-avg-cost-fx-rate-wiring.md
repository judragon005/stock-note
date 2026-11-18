# 02 — 戰情室投組風控對齊 avgCostFxRate 根除美股匯差 31.8 靜默斷路

**What to build:** 移除 `useWarRoomPortfolioMetrics` 中 `as unknown as { avgExchangeRate?: number }` 雙重轉型並改讀正統 `h.avgCostFxRate`，補齊 TDD 紅綠契約測試，確保會計引擎產出之美股買進成本匯率無損貫通戰情室護盾計算。

**Blocked by:** None — can start immediately

**Status:** done (Spec 0236 / Issue #586)

- [x] 移除 `useWarRoomPortfolioMetrics.ts` 中的 `avgExchangeRate` 雙重轉型
- [x] `useWarRoomPortfolioMetrics.test.ts` 補齊 `avgCostFxRate: 29.5` 精確測試並通過 Red → Green 循環
