/**
 * nas-autonomous-scheduler.cjs
 * NAS 24/7 無人值守伺服器內建自治排程器 (Spec 0242)
 * 無需使用者開啟瀏覽器網頁，常駐伺服器依台北時間 (UTC+8) 與湖倉新鮮度自動觸發每日盤後與每週六同步。
 */

const { initSqliteLakehouseDb, isSqliteSupported } = require('./sqlite-db-core.cjs');
const { checkMarketFreshness } = require('./market-freshness-service.cjs');
const { runWeeklyLakehouseSync } = require('./weekly-lakehouse-sync.cjs');

const DEFAULT_TICK_MS = 30 * 60 * 1000; // 每 30 分鐘檢查一次

/**
 * 將任意 Date 轉換為台北時間 (UTC+8) 的年月日時分與星期
 */
function getTaipeiTimeParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 8 * 3600 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(), // 0=日, 1=一 ... 6=六
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    isoDate: shifted.toISOString().slice(0, 10),
  };
}

/**
 * 決定當前時間點應觸發何種自動更新任務 (純函式，利於離線確定性測試)
 */
function evaluateScheduleWindow(nowDate, freshness, lastRunState = {}) {
  const tp = getTaipeiTimeParts(nowDate);
  const actions = { runDaily: false, runWeekly: false, reason: 'UP_TO_DATE' };

  // 1. 每週全市場集保與配息更新：週六 10:00 後 或 TDCC/月營收陳舊，且今日尚未執行過週更
  const isSaturdayMorningWindow = tp.dayOfWeek === 6 && tp.hour >= 10;
  const isWeeklyDataStale = Boolean(freshness?.tdcc?.isStale || freshness?.revenue?.isStale);
  if ((isSaturdayMorningWindow || isWeeklyDataStale) && lastRunState.lastWeeklyIsoDate !== tp.isoDate) {
    actions.runWeekly = true;
    actions.reason = isSaturdayMorningWindow ? 'SATURDAY_WEEKLY_WINDOW' : 'WEEKLY_DATA_STALE';
  }

  // 2. 每日盤後增量更新：週一~週五 15:30 後若台股陳舊，或美股陳舊，且今日該視窗尚未跑過
  const isTwAfterClose =
    tp.dayOfWeek >= 1 && tp.dayOfWeek <= 5 && (tp.hour > 15 || (tp.hour === 15 && tp.minute >= 30));
  const isDailyDataStale = Boolean(freshness?.tw?.isStale || freshness?.us?.isStale);
  if ((isTwAfterClose || isDailyDataStale) && lastRunState.lastDailyIsoDate !== tp.isoDate) {
    if (isDailyDataStale) {
      actions.runDaily = true;
      actions.reason = actions.runWeekly ? `${actions.reason}+DAILY_STALE` : 'DAILY_MARKET_STALE';
    }
  }

  return actions;
}

/**
 * 啟動 NAS 內建無頭自治排程器
 * 支援環境變數 DISABLE_BUILTIN_SCHEDULER=true 一鍵停用
 */
function startNasAutonomousScheduler({
  customDbPath,
  tickMs = DEFAULT_TICK_MS,
  runOnStart = true,
  nowFn = () => new Date(),
  handlers = {},
} = {}) {
  if (process.env.DISABLE_BUILTIN_SCHEDULER === 'true') {
    console.log('⏸️ [NAS Scheduler] 已透過 DISABLE_BUILTIN_SCHEDULER=true 停用內建排程器。');
    return { stop: () => {}, runTickNow: async () => ({ skipped: true, reason: 'DISABLED' }) };
  }

  let isRunning = false;
  const lastRunState = {
    lastDailyIsoDate: null,
    lastWeeklyIsoDate: null,
  };

  async function runTickNow() {
    if (isRunning || !isSqliteSupported()) {
      return { skipped: true, reason: isRunning ? 'IN_FLIGHT' : 'SQLITE_UNSUPPORTED' };
    }
    isRunning = true;
    try {
      const db = initSqliteLakehouseDb(customDbPath);
      const freshness = (handlers.checkMarketFreshness || checkMarketFreshness)(db);
      const now = nowFn();
      const tp = getTaipeiTimeParts(now);
      const plan = evaluateScheduleWindow(now, freshness, lastRunState);

      if (!plan.runDaily && !plan.runWeekly) {
        return { skipped: false, triggered: false, plan };
      }

      if (plan.runDaily) {
        try {
          const runDailyFn =
            handlers.runDailySync ||
            (async (dbPath) => {
              const { runTwMarketSync } = require('./sync-tw-market.cjs');
              const { runUsMarketSync } = require('./sync-us-market.cjs');
              await runTwMarketSync({ customDbPath: dbPath });
              await runUsMarketSync({ mode: 'daily', customDbPath: dbPath });
            });
          await runDailyFn(customDbPath);
          lastRunState.lastDailyIsoDate = tp.isoDate;
        } catch (err) {
          console.warn('[NAS Scheduler] 每日增量同步警示:', err?.message || err);
        }
      }

      if (plan.runWeekly) {
        try {
          const runWeeklyFn = handlers.runWeeklyLakehouseSync || runWeeklyLakehouseSync;
          await runWeeklyFn({ customDbPath });
          lastRunState.lastWeeklyIsoDate = tp.isoDate;
        } catch (err) {
          console.warn('[NAS Scheduler] 每週全市場湖倉同步警示:', err?.message || err);
        }
      }

      return { skipped: false, triggered: true, plan };
    } catch (err) {
      console.warn('[NAS Scheduler] 排程巡檢異常 (已隔離，不影響服務):', err?.message || err);
      return { skipped: false, triggered: false, error: err?.message || String(err) };
    } finally {
      isRunning = false;
    }
  }

  if (runOnStart) {
    // 伺服器啟動後延遲 5 秒非同步巡檢一次，避免阻塞冷啟動
    const bootTimer = setTimeout(() => {
      runTickNow().catch(() => {});
    }, 5000);
    if (typeof bootTimer.unref === 'function') bootTimer.unref();
  }

  const interval = setInterval(() => {
    runTickNow().catch(() => {});
  }, tickMs);
  if (typeof interval.unref === 'function') interval.unref();

  return {
    runTickNow,
    stop: () => clearInterval(interval),
    getState: () => ({ isRunning, ...lastRunState }),
  };
}

module.exports = {
  DEFAULT_TICK_MS,
  getTaipeiTimeParts,
  evaluateScheduleWindow,
  startNasAutonomousScheduler,
};
