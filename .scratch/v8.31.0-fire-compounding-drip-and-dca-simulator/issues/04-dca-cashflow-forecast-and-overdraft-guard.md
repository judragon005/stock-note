# Issue 04: 實作 DCA 未來 30 天現金防透支推演與資金缺口警示

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `dca`, `cashflow`, `risk`

## 任務說明
1. 在 `src/engine/dcaSchedulerEngine.ts` 中實作現金防透支功能：
   - 實作 `forecastDCAOverdraftRisk(executions: DCAScheduledExecution[], accounts: BrokerAccount[], currentCashMap: Record<string, number>): CashflowOverdraftForecast[]`：
     - 依帳戶維度與交割日 (`settlementDate`) 時序排序。
     - 逐筆扣除預計扣款金額，推演 `projectedCashTwd`。
     - 若 `projectedCashTwd < 0`：
       - 設定 `isOverdraftRisk: true`。
       - 計算 `shortfallAmountTwd = Math.abs(projectedCashTwd)`。
     - 輸出各帳戶在未來 30 天的最低現金水位。
2. 擴充單元測試 `src/engine/dcaSchedulerEngine.test.ts`：
   - 驗證交割戶資金充裕時，全數標記 `isOverdraftRisk: false`。
   - 驗證扣款後餘額跌破 0 時，精確計算出缺口金額並正確標記透支。
   - 驗證多帳戶獨立隔離核算。
