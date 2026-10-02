# 03 — 根除預設報告假數據污染與落實誠實 Empty State (Sanitize Default Fallback & Honest Empty State)

**What to build:**
1. 修改 `src/engine/aiForceDashboardEngine.ts` 之 `createDefaultAiForceReport`：
   - 清理所有非 2360 之硬編碼數值（徹底移除 `47.97 開盤`、`49.18 最高`、`47.72 最低`、`1,200 張成交量`、`3,100 單` 等幽靈數據）。
   - 若該標的無真實日 K，`dataPointsCount` 誠實回傳 `0`，`dataRangeText` 設定為 `尚無歷史交易日資料`。
   - 價格指標若無即時行情，回傳 `undefined` 或 `-`，由頂部 `HeaderMarketBar` 誠實呈現 `-`。
2. 協同 UI 呈現：
   - 確保頂部 `HeaderMarketBar` 與下方 `KLineChartCard` 之 Empty State 狀態完全一致（資料筆數 0 日，主 K 線圖顯示「尚無歷史交易日 K 數列」），徹底杜絕「頂部說有 30 日、主 K 線圖卻說沒資料」的撕裂矛盾。

**Blocked by:** None

**Status:** completed

- [x] 清理 `createDefaultAiForceReport` 內的所有硬編碼假數據。
- [x] 標的無歷史資料時，`dataPointsCount` 誠實回傳 0，各項行情指標安全 fallback。
- [x] 更新 `aiForceDashboardEngine.test.ts`，驗證無數據標的產生之 fallback 報告具備 100% 誠實 Empty State。
