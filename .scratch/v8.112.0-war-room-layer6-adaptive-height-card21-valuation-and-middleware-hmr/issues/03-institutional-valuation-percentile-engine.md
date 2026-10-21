# Ticket 03: 機構級歷史估值百分位數 (PR) 與倍數區間 (Min/Median/Max) 量化推導引擎

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0199](../../../docs/specs/0199-war-room-layer6-adaptive-height-institutional-valuation-percentile-and-middleware-hmr-spec.md)
- **關聯 Issue**：#310

## 任務目標
1. 擴充 `types/aiForceDashboard.ts` 中的 `ValuationMetricsData`，納入自身歷史百分位數與倍數區間欄位 (`pePercentile`, `peMin`, `peMedian`, `peMax`, `pbPercentile`, `historySampleSize`)。
2. 在 `aiForceDashboardEngine.ts` 實作 `calculateValuationPercentile()` 演算法：
   - 拒絕靜態一刀切，統計個股自身歷史長期的有效 PE/PB 數列。
   - 計算當前值超越歷史樣本數之百分比 (Percentile Rank, PR)。
   - $PR \le 20\%$ 為低估便宜；$20\% < PR \le 80\%$ 為合理常態；$PR > 80\%$ 為高估偏貴。
   - 具備防禦機制：當 $PE \le 0$ 或本益比失真時，自動切換為 PB Ratio 歷史分位數。
3. 撰寫完整單元測試驗證演算法在各情境下的正確性。
