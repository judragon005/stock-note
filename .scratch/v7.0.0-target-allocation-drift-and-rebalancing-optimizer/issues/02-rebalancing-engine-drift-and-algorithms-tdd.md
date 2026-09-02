# Ticket 02: 再平衡運算引擎與 TDD 單元測試 (Rebalancing Engine & TDD Suite)

## 任務描述
遵循測試驅動開發 (TDD) 原則，先建立單元測試 `rebalancingEngine.test.ts`，接著實作 `src/engine/rebalancingEngine.ts`。提供偏離度分析、定期注水加碼、全量買賣再平衡以及台美股下單顆粒度轉換等核心運算。

## 涉及檔案
- `src/engine/rebalancingEngine.ts` (新建)
- `src/engine/rebalancingEngine.test.ts` (新建)

## 驗收標準 (Acceptance Criteria)
1. **偏離度分析 (`calculateAllocationDrift`)**：
   - 精確計算各標的市值佔比 $P_i = V_i / V_{total} \times 100\%$ 與偏離度 $Drift_i = P_i - Target_i$。
   - 依據容忍門檻輸出 `BALANCED` (正常)、`MILD_DRIFT` (輕度偏離)、`SEVERE_DRIFT` (顯著失衡)。
2. **定期注水加碼演算法 (`generateCashInRebalancePlan`)**：
   - 演算法優先將注水現金依缺口比例補足低配標的，絕不產生賣出動作，無摩擦成本與稅負。
   - 支援注水資金不足、充裕與已完全平衡等各種情境。
3. **全量買賣再平衡演算法 (`generateFullRebalancePlan`)**：
   - 超配標的產生 `SELL` 減碼建議，低配標的產生 `BUY` 加碼建議，且總賣出與總買進在扣除目標後維持平衡。
4. **下單顆粒度與跨幣別適配 (`convertAmountToOrderUnits`)**：
   - 台股精準拆解為「整張數 (1,000股) + 零股數」。
   - 美股支援小數點碎股精算 (小數點後 3 位)。
   - USD 標的同步輸出原幣別金額與折合 TWD 金額。
5. 單元測試 100% 綠燈通過，覆蓋邊界與防呆條件。
