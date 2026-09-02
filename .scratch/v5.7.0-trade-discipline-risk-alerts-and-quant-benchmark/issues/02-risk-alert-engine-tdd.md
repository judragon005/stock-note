# 子任務票券 #02: 停損停利風控判定與距離試算引擎 TDD (Risk Alert Engine TDD)

- **母票券**: [issue-0041.md](issue-0041.md)
- **版本**: v5.7.0
- **分流標籤**: `ready-for-agent`
- **狀態**: `RESOLVED`
- **目標檔案**:
  - `src/engine/riskAlertEngine.ts` (新增)
  - `src/engine/riskAlertEngine.test.ts` (新增)

---

## 🎯 任務目標
以嚴格 TDD 模式開發純函式風控評估引擎：
1. **`calculatePlannedRiskRewardRatio(entryPrice, stopLossPrice, takeProfitPrice): number | undefined`**
   - 公式：$\text{RR} = \frac{\text{takeProfitPrice} - \text{entryPrice}}{\text{entryPrice} - \text{stopLossPrice}}$
   - 防禦：分母 $\le 0$ 或數值無效時回傳 `undefined`，小數點精確至兩位。
2. **`evaluateRiskStatus(currentPrice, stopLossPrice, takeProfitPrice, thresholdRatio = 0.03): RiskAlertStatus`**
   - 跌破/等於停損價 ➔ `STOP_LOSS_TRIGGERED`
   - 距停損 $\le 3\%$ ➔ `NEAR_STOP_LOSS`
   - 達到/超越停利價 ➔ `TAKE_PROFIT_TRIGGERED`
   - 距停利 $\le 3\%$ ➔ `NEAR_TAKE_PROFIT`
   - 其餘或未設 ➔ `NORMAL`
3. **`calculateRiskDistances(currentPrice, stopLossPrice, takeProfitPrice)`**
   - 計算百分比距離與金額差額。
4. **撰寫單元測試 `riskAlertEngine.test.ts`** 覆蓋所有邊界狀況。

---

## 驗收標準
- [ ] 執行 `npx vitest run src/engine/riskAlertEngine.test.ts` 測試 100% 綠燈通過。
