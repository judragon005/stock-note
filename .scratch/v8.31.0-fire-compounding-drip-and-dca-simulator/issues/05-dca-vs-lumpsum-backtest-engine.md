# Issue 05: 實作定期定額 vs. 單筆歐印 (Lump-Sum) 機會成本歷史回測

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `dca`, `backtest`, `quant`

## 任務說明
1. 在 `src/engine/dcaSchedulerEngine.ts` 中實作歷史回測演算法：
   - 實作 `backtestDCAvsLumpSum(historicalPrices: { date: string; close: number }[], monthlyAmount: number, totalMonths: number): DCABacktestResult`：
     - **DCA 策略**：每月指定日按當日收盤價投入固定金額，累計總買進股數 $S_{\text{DCA}}$，計算平均每股持股成本與最後期末現值。
     - **Lump-Sum 策略**：期初第一天將全部準備金 ($W = \text{monthlyAmount} \times \text{totalMonths}$) 一次性按當日收盤價全額買進，計算期末現值。
     - 計算兩種策略之最終資產差異比率 (`wealthDeltaPercent`)。
     - 計算兩種策略在持有期間各自的最大歷程回撤 (Max Drawdown, MDD)。
2. 擴充單元測試 `src/engine/dcaSchedulerEngine.test.ts`：
   - 構造單調上漲行情數據，驗證 Lump-Sum 策略跑贏 DCA。
   - 構造單調下跌與先跌後漲（微笑曲線）數據，驗證 DCA 策略平滑平均成本並降低 MDD。
