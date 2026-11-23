/**
 * nas-autonomous-scheduler.cjs
 * NAS 24/7 無人值守伺服器內建自治排程器 (Spec 0242)
 * 無需使用者開啟瀏覽器網頁，常駐伺服器依台北時間 (UTC+8) 與湖倉新鮮度自動觸發每日盤後與每週六同步。
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  initSqliteLakehouseDb,
  isSqliteSupported,
  getSqliteDbConnection,
  getDbPath,
  checkpointSqliteWal,
} = require('./sqlite-db-core.cjs');
const { checkMarketFreshness } = require('./market-freshness-service.cjs');
const { runWeeklyLakehouseSync } = require('./weekly-lakehouse-sync.cjs');

const DEFAULT_TICK_MS = 30 * 60 * 1000; // 每 30 分鐘檢查一次
const DEFAULT_BACKUP_KEEP = 2;
const BACKUP_NAME_PATTERN = /^(.+)\.backup-(\d{8})\.db$/;

/**
 * 於資料庫同目錄建立一致性 SQLite 滾動快照並修剪舊備份 (Spec 0243 Ticket 04)
 * 先執行 WAL Checkpoint，再以 VACUUM INTO 產出 <base>.backup-YYYYMMDD.db (台北日期)，僅保留最新 keep 份
 */
function createRollingBackup({ dbPath, now = new Date(), keep = DEFAULT_BACKUP_KEEP } = {}) {
  const resolvedDbPath = getDbPath(dbPath);
  const dir = path.dirname(resolvedDbPath);
  const baseName = path.basename(resolvedDbPath, '.db');
  const ymd = getTaipeiTimeParts(now).isoDate.replace(/-/g, '');
  const fileName = `${baseName}.backup-${ymd}.db`;
  const backupPath = path.join(dir, fileName);

  try {
    const db = getSqliteDbConnection(resolvedDbPath);
    checkpointSqliteWal(db);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); // VACUUM INTO 不可覆寫既有檔
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }

  const backups = fs
    .readdirSync(dir)
    .filter((name) => {
      const m = name.match(BACKUP_NAME_PATTERN);
      return m && m[1] === baseName;
    })
    .sort();
  const pruned = backups.slice(0, Math.max(0, backups.length - keep));
  for (const name of pruned) {
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {
      // 單檔刪除失敗不影響備份結果
    }
  }

  return {
    ok: true,
    fileName,
    path: backupPath,
    sizeBytes: fs.statSync(backupPath).size,
    pruned,
  };
}

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
    lastMacroIsoDate: null,
    latestBackup: null,
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
      const tasks = {};

      if (!plan.runDaily && !plan.runWeekly) {
        return { skipped: false, triggered: false, plan, tasks };
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
          tasks.daily = { ok: true };
        } catch (err) {
          tasks.daily = { ok: false, error: err?.message || String(err) };
          console.warn('[NAS Scheduler] 每日增量同步警示:', tasks.daily.error);
        }

        // 宏觀同步獨立隔離：台美股失敗不影響宏觀指標更新 (Spec 0243 Ticket 04)
        try {
          const runMacroFn =
            handlers.runMacroSync ||
            (async (dbPath) => {
              const { fetchMacroSentimentDaily, ingestMacroSentimentToDb } = require('./ingest-macro-sentiment.cjs');
              // FRED_API_KEY 為選配；未設定時 ingest 模組自動降級免 Key 公開 CSV
              const data = await fetchMacroSentimentDaily({ fredApiKey: process.env.FRED_API_KEY || undefined });
              return { ok: ingestMacroSentimentToDb(data, dbPath), date: data?.date };
            });
          const macroResult = await runMacroFn(customDbPath);
          lastRunState.lastMacroIsoDate = tp.isoDate;
          tasks.macro = { ok: true, ...(macroResult || {}) };
        } catch (err) {
          tasks.macro = { ok: false, error: err?.message || String(err) };
          console.warn('[NAS Scheduler] 每日宏觀同步警示:', tasks.macro.error);
        }
      }

      if (plan.runWeekly) {
        try {
          const runWeeklyFn = handlers.runWeeklyLakehouseSync || runWeeklyLakehouseSync;
          await runWeeklyFn({ customDbPath });
          lastRunState.lastWeeklyIsoDate = tp.isoDate;
          tasks.weekly = { ok: true };

          // 每週全市場同步成功後自動產出一致性滾動快照並修剪舊備份 (Spec 0243 Ticket 04)
          const runBackupFn = handlers.createRollingBackup || createRollingBackup;
          const backupResult = runBackupFn({ dbPath: customDbPath, now });
          tasks.backup = backupResult;
          if (backupResult?.ok) {
            lastRunState.latestBackup = {
              fileName: backupResult.fileName,
              path: backupResult.path,
              sizeBytes: backupResult.sizeBytes,
              createdAt: now.toISOString(),
            };
          }
        } catch (err) {
          tasks.weekly = { ok: false, error: err?.message || String(err) };
          console.warn('[NAS Scheduler] 每週全市場湖倉同步警示:', tasks.weekly.error);
        }
      }

      return { skipped: false, triggered: true, plan, tasks };
    } catch (err) {
      console.warn('[NAS Scheduler] 排程巡檢異常 (已隔離，不影響服務):', err?.message || err);
      return { skipped: false, triggered: false, error: err?.message || String(err) };
    } finally {
      isRunning = false;
    }
  }

  let bootTimer = null;
  if (runOnStart) {
    // 伺服器啟動後延遲 5 秒非同步巡檢一次，避免阻塞冷啟動
    bootTimer = setTimeout(() => {
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
    stop: () => {
      if (bootTimer) clearTimeout(bootTimer);
      clearInterval(interval);
    },
    getState: () => ({ isRunning, ...lastRunState }),
  };
}

module.exports = {
  DEFAULT_TICK_MS,
  DEFAULT_BACKUP_KEEP,
  getTaipeiTimeParts,
  evaluateScheduleWindow,
  createRollingBackup,
  startNasAutonomousScheduler,
};
