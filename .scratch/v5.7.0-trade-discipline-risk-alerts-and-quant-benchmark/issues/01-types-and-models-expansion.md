# 子任務票券 #01: 核心資料模型與型別定義擴充 (Types & Models Expansion)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/types/stock.ts`

---

## 🎯 任務目標
在 `src/types/stock.ts` 中精準擴充主動交易、風控與量化所需之所有 TypeScript 介面與型別定義：
1. **交易計畫介面 (`TradePlan`)**：
   - `entryReason?: string`（進場理由/交易假說）
   - `stopLossPrice?: number`（預設停損價）
   - `takeProfitPrice?: number`（預設停利價）
   - `plannedRiskRewardRatio?: number`（預期風報酬比）
2. **賽後覆盤型別 (`TradeMistakeType`, `TradeReview`)**：
   - `TradeMistakeType`: `'CHASE_HIGH' | 'HOLD_LOSER' | 'PREMATURE_PROFIT' | 'EMOTIONAL_SIZE' | 'NO_PLAN' | 'OTHER'`
   - `TradeReview`: `isPlanFollowed: boolean`, `mistakesMade?: TradeMistakeType[]`, `lessonsLearned?: string`, `disciplineScore: number`, `reviewedAt: number`
3. **風控指標介面 (`RiskAlertStatus`, `HoldingRiskMetrics`)**：
   - `RiskAlertStatus`: `'NORMAL' | 'NEAR_STOP_LOSS' | 'STOP_LOSS_TRIGGERED' | 'NEAR_TAKE_PROFIT' | 'TAKE_PROFIT_TRIGGERED'`
   - `HoldingRiskMetrics`: `stopLossPrice?: number`, `takeProfitPrice?: number`, `riskStatus: RiskAlertStatus`, `distanceToStopLossPercent?: number`, `distanceToTakeProfitPercent?: number`
4. **量化指標介面 (`QuantPerformanceMetrics`, `BenchmarkType`)**：
   - `BenchmarkType`: `'NONE' | '0050' | 'SPY' | 'BALANCED_50_50'`
   - `QuantPerformanceMetrics`: `alpha: number`, `beta: number`, `sharpeRatio: number`, `sortinoRatio?: number`, `annualizedVolatility: number`, `benchmarkMaxDrawdown: number`, `portfolioMaxDrawdown: number`, `correlation: number`
5. **擴充 `TradeRecord` 與 `HoldingPosition`** 引入上述可選欄位。

---

## 驗收標準
- [ ] 執行 `npx tsc --noEmit` 確保 0 錯誤。
- [ ] 現有所有測試維持 100% 通過。
