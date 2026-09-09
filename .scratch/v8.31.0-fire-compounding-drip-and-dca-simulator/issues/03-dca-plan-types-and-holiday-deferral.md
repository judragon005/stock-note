# Issue 03: 實作定期定額 (DCA) 計畫排程與休市順延撮合演算法

## 狀態與分流
- 狀態：`OPEN`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `dca`, `settlement`, `calendar`

## 任務說明
1. 建立 `src/engine/dcaSchedulerEngine.ts`：
   - 實作 `generateDCASchedule(plans: DCAPlan[], daysAhead: number = 30, baseDate?: string): DCAScheduledExecution[]`：
     - 遍歷未來 `daysAhead` 天。
     - 檢查是否落在約定扣款日 `executionDays`。
     - 串接 `settlementEngine.ts` 之 `isMarketHoliday(date, market)` 與週末判定：
       - 若為休市日，向後順延至第一個開市撮合交易日 ($T$ 日)，並標記 `isHolidayDeferred: true`。
       - 同一計畫在同一工作日若重複落點（如因連續假期遞延合併），維持合併扣款或按筆列出。
     - 推導交割扣款日 `settlementDate`（台股 $T+2$，美股 $T+1$，均遵循各市場營業日曆）。
2. 編寫單元測試 `src/engine/dcaSchedulerEngine.test.ts`：
   - 驗證扣款日逢週六/週日順延至下週一。
   - 驗證扣款日逢春節或清明長假順延至收假後第一個開盤日。
   - 驗證台股與美股交割天數差異。
