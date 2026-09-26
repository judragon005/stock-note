# 07 — 主報表組裝總管線集成 (Cards 03, 13, 14 Pipeline Integration)

**What to build:**
修改 `src/engine/aiForceDashboardEngine.ts`：
1. 引入 `calculateMultiDimensionRadar`、`estimateMarketSentiment`、`calculateAiConfidence`。
2. 在 `generateAiForceReportFromCandles` 內：
   - 呼叫 `calculateMultiDimensionRadar` 覆蓋 `multiDimensionRadar`
   - 呼叫 `estimateMarketSentiment` 覆蓋 `marketSentiment`
   - 呼叫 `calculateAiConfidence` 覆蓋 `aiConfidence`
3. 確保回傳報表中，使用者換股時，03、13、14 卡片不再為固定靜態常數。

**Blocked by:** Ticket 04, Ticket 05, Ticket 06

**Status:** completed

- [x] `generateAiForceReportFromCandles` 輸出之 report 包含動態多維度雷達、市場情緒與 AI 信心度
- [x] 既有 18 張卡片模組不受破壞
