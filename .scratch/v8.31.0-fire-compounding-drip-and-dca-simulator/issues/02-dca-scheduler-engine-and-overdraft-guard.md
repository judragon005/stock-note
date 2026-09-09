# Issue 02: 實作定期定額 (DCA) 智慧排程、假日順延與現金防透支引擎 (dcaSchedulerEngine)

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `dca`, `cashflow`, `precision`

## 任務說明
1. 建立 `src/engine/dcaSchedulerEngine.ts`：
   - 定義 `DCAPlan`、`DCACashflowProjection`、`DCABacktestResult` 型別。
   - 整合 `settlementEngine.ts` 的 `isMarketHoliday` 國定休市日曆：
     - 若定投扣款約定日遇週末或法定假日，自動順延至下一撮合工作日。
     - 台股結算日為 $T+2$，美股為 $T+1$。
   - 實作未來 30 天現金防透支預警：
     - 傳入交割戶即時可用現金與在途金額，計算每一筆預計扣款後的預估水位。
     - 若水位 $< 0$，標記 `isOverdraftRisk: true` 並算出資金缺口。
   - 實作定投 vs 歐印 (Lump-Sum) 機會成本歷史回測計算函數。
2. 編寫完整單元測試 `src/engine/dcaSchedulerEngine.test.ts`：
   - 驗證遇週六日順延、遇春節清明連假順延。
   - 驗證交割戶餘額充足與餘額不足透支預警判斷。
   - 驗證定期定額平均成本與單筆投入報酬比較。
