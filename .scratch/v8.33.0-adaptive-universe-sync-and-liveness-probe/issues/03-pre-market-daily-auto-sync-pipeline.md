# Issue 03: 每日開市前背景校準管線 (Pre-Market Daily Auto-Sync Pipeline)

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `pipeline`
- 關聯 Issue：#5

## 任務說明
1. 在 `src/engine/adaptiveUniverseEngine.ts` 實作：
   - `checkAndSyncUniverseDaily(force?: boolean): Promise<UniverseSyncResult>`
   - 整合 `holidayCalendar.ts` 取得今日開盤狀態。
   - 檢查 `lastCheckedDate`，若今日尚未校準且為開市日，啟動非同步背景比對與校準任務。
   - 同一日不重複連線，節流保護。
2. 撰寫單元測試驗證跨日觸發、同日節流與強制作業行為。
