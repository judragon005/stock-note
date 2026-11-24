/**
 * nas-autonomous-scheduler.cjs
 * NAS 24/7 無人值守伺服器內建自治排程器 (Spec 0242 / Spec 0243 / Spec 0246)
 * 無需使用者開啟瀏覽器網頁，常駐伺服器依台北時間 (UTC+8) 與湖倉新鮮度自動觸發四軌獨立水位線排程：
 * - twDaily：台股近 30 日缺口調諧 + 兩階段盤後容錯收斂
 * - usDaily：美股每日盤後同步（獨立水位線，絕不鎖死台股午後同步）
 * - macro：每日宏觀情緒與殖利率同步（獨立隔離）
 * - weekly：每週集保、ETF 元數據／淨值、除權息、月營收與滾動備份
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
const { MARKET_SETTLEMENT_CUTOFFS } = require('./sync-thresholds.cjs');
const {
  withGlobalSyncLock,
  reconcileTwLakehouse,
  resolveTwPostClosePhase,
} = require('./lakehouse-sync-coordinator.cjs');

const DEFAULT_TICK_MS = 30 * 60 * 1000; // 每 30 分鐘檢查一次
const DEFAULT_BACKUP_KEEP = 2;
const BACKUP_NAME_PATTERN = /^(.+)\.backup-(\d{8})\.db$/;

function createInitialLaneState() {
  const maxRetries = MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE;
  return {
    twDaily: {
      watermarkDate: null,
      lastRunIsoDate: null,
      status: 'idle',
      phase: null,
      retryCount: 0,
      maxRetries,
      lastError: null,
      updatedAt: null,
    },
    usDaily: {
      watermarkDate: null,
      lastRunIsoDate: null,
      status: 'idle',
      retryCount: 0,
      maxRetries,
      lastError: null,
      updatedAt: null,
    },
    macro: {
      watermarkDate: null,
      lastRunIsoDate: null,
      status: 'idle',
      retryCount: 0,
      maxRetries,
      lastError: null,
      updatedAt: null,
    },
    weekly: {
      watermarkDate: null,
      lastRunIsoDate: null,
      status: 'idle',
      retryCount: 0,
      maxRetries,
      lastError: null,
      updatedAt: null,
    },
  };
}

function getLaneRetryCountForDate(laneObj, isoDate) {
  if (!laneObj || laneObj.lastRunIsoDate !== isoDate) return 0;
  return Number(laneObj.retryCount || 0);
}

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
 * 決定當前時間點應觸發何種自動更新任務 (純函式，Spec 0246 四軌獨立水位線，杜絕跨市場鎖死)
 */
function evaluateScheduleWindow(nowDate, freshness, lastRunState = {}) {
  const tp = getTaipeiTimeParts(nowDate);
  const lanes = lastRunState.lanes || null;
  const maxRetries = MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE;

  const actions = {
    runTwDaily: false,
    runUsDaily: false,
    runMacro: false,
    runWeekly: false,
    runDaily: false,
    reason: 'UP_TO_DATE',
  };

  const reasons = [];

  // 1. 每週全市場集保、ETF 元數據、除權息與月營收軌道 (獨立)
  const isSaturdayMorningWindow = tp.dayOfWeek === 6 && tp.hour >= 10;
  const isWeeklyDataStale = Boolean(freshness?.tdcc?.isStale || freshness?.revenue?.isStale);
  const weeklyDoneToday =
    lanes?.weekly?.lastRunIsoDate === tp.isoDate && lanes?.weekly?.status === 'ok';
  const legacyWeeklyDone = !lanes && lastRunState.lastWeeklyIsoDate === tp.isoDate;
  const weeklyRetries = getLaneRetryCountForDate(lanes?.weekly, tp.isoDate);
  if ((isSaturdayMorningWindow || isWeeklyDataStale) && !weeklyDoneToday && !legacyWeeklyDone && weeklyRetries < maxRetries) {
    actions.runWeekly = true;
    reasons.push(isSaturdayMorningWindow ? 'SATURDAY_WEEKLY_WINDOW' : 'WEEKLY_DATA_STALE');
  }

  // 2. 台股日線缺口調諧軌道 (完全獨立於美股，美股清晨完成絕不阻斷台股午後同步)
  const twAnchor = freshness?.tw?.anchorDate || null;
  const twIsStale = Boolean(freshness?.tw?.isStale);
  const twWatermarkDone = Boolean(twAnchor && lanes?.twDaily?.watermarkDate === twAnchor && !twIsStale);
  const legacyDailyBlocked = !lanes && lastRunState.lastDailyIsoDate === tp.isoDate;
  const twRetries = getLaneRetryCountForDate(lanes?.twDaily, tp.isoDate);
  if (twIsStale && !twWatermarkDone && !legacyDailyBlocked && twRetries < maxRetries) {
    actions.runTwDaily = true;
    reasons.push('TW_DAILY_STALE');
  }

  // 3. 美股日線軌道 (獨立水位線，僅看 us.isStale 與 usDaily 水位線)
  const usAnchor = freshness?.us?.anchorDate || null;
  const usIsStale = Boolean(freshness?.us?.isStale);
  const usWatermarkDone = Boolean(usAnchor && lanes?.usDaily?.watermarkDate === usAnchor && !usIsStale);
  const usRetries = getLaneRetryCountForDate(lanes?.usDaily, tp.isoDate);
  if (usIsStale && !usWatermarkDone && !legacyDailyBlocked && usRetries < maxRetries) {
    actions.runUsDaily = true;
    reasons.push('US_DAILY_STALE');
  }

  actions.runDaily = actions.runTwDaily || actions.runUsDaily;

  // 4. 宏觀情緒軌道 (獨立追蹤，任一日更觸發且今日宏觀尚未完成時執行)
  const macroDoneToday =
    lanes?.macro?.watermarkDate === tp.isoDate ||
    lastRunState.lastMacroIsoDate === tp.isoDate;
  const macroRetries = getLaneRetryCountForDate(lanes?.macro, tp.isoDate);
  if (actions.runDaily && !macroDoneToday && macroRetries < maxRetries) {
    actions.runMacro = true;
  }

  actions.reason = reasons.length > 0 ? reasons.join('+') : 'UP_TO_DATE';
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
    return {
      stop: () => {},
      runTickNow: async () => ({ skipped: true, reason: 'DISABLED' }),
      getState: () => ({ enabled: false }),
    };
  }

  let isRunning = false;
  const lastRunState = {
    lastDailyIsoDate: null,
    lastWeeklyIsoDate: null,
    lastMacroIsoDate: null,
    latestBackup: null,
    lanes: createInitialLaneState(),
  };

  function bumpLaneAttempt(laneKey, isoDate) {
    const lane = lastRunState.lanes[laneKey];
    if (lane.lastRunIsoDate !== isoDate) {
      lane.lastRunIsoDate = isoDate;
      lane.retryCount = 0;
    }
    lane.retryCount += 1;
    lane.status = 'running';
    lane.updatedAt = nowFn().toISOString();
    return lane;
  }

  async function runTickNow() {
    if (isRunning || !isSqliteSupported()) {
      return { skipped: true, reason: isRunning ? 'IN_FLIGHT' : 'SQLITE_UNSUPPORTED' };
    }
    isRunning = true;
    try {
      const lockOutcome = await withGlobalSyncLock('nas-scheduler', async () => {
        const db = initSqliteLakehouseDb(customDbPath);
        const now = nowFn();
        const freshness = (handlers.checkMarketFreshness || checkMarketFreshness)(db, now);
        const tp = getTaipeiTimeParts(now);
        const plan = evaluateScheduleWindow(now, freshness, lastRunState);
        const tasks = {};

        if (!plan.runTwDaily && !plan.runUsDaily && !plan.runMacro && !plan.runWeekly) {
          return { skipped: false, triggered: false, plan, tasks };
        }

        // 相容舊版單一 handlers.runDailySync 注入（如 Spec 0243 Slice 4 測試）
        if (plan.runDaily && typeof handlers.runDailySync === 'function') {
          const twLane = bumpLaneAttempt('twDaily', tp.isoDate);
          const usLane = bumpLaneAttempt('usDaily', tp.isoDate);
          try {
            await handlers.runDailySync(customDbPath);
            lastRunState.lastDailyIsoDate = tp.isoDate;
            twLane.status = 'ok';
            twLane.watermarkDate = freshness?.tw?.anchorDate || tp.isoDate;
            twLane.lastError = null;
            usLane.status = 'ok';
            usLane.watermarkDate = freshness?.us?.anchorDate || tp.isoDate;
            usLane.lastError = null;
            tasks.daily = { ok: true };
          } catch (err) {
            const msg = err?.message || String(err);
            twLane.status = 'error';
            twLane.lastError = msg;
            usLane.status = 'error';
            usLane.lastError = msg;
            tasks.daily = { ok: false, error: msg };
            console.warn('[NAS Scheduler] 每日增量同步警示:', msg);
          }
        } else {
          // 軌道 1：台股缺口調諧與兩階段盤後收斂 (獨立水位線)
          if (plan.runTwDaily) {
            const twLane = bumpLaneAttempt('twDaily', tp.isoDate);
            try {
              const runTwFn =
                handlers.runTwDailySync ||
                ((dbPath, ctx) =>
                  reconcileTwLakehouse({
                    customDbPath: dbPath,
                    now: ctx.now,
                    maxLookbackDays: MARKET_SETTLEMENT_CUTOFFS.GAP_CATCHUP_LOOKBACK_DAYS,
                  }));
              const twRes = await runTwFn(customDbPath, { now, freshness });
              twLane.phase = twRes?.phase || resolveTwPostClosePhase(now);
              if (twRes && twRes.ok !== false && twRes.watermarkAdvanced !== false) {
                twLane.status = 'ok';
                twLane.watermarkDate = twRes.watermarkDate || freshness?.tw?.anchorDate || tp.isoDate;
                twLane.lastError = null;
              } else if (twRes && twRes.phase === 'PHASE_1_PRICE_ONLY') {
                twLane.status = 'phase1_pending_chips';
                twLane.lastError = null;
              } else {
                twLane.status = 'partial_or_retry';
                twLane.lastError = twRes?.reason || twRes?.error || 'TW_INCOMPLETE';
              }
              tasks.twDaily = { ok: twRes?.ok !== false, ...(twRes || {}) };
            } catch (err) {
              const msg = err?.message || String(err);
              twLane.status = 'error';
              twLane.lastError = msg;
              tasks.twDaily = { ok: false, error: msg };
              console.warn('[NAS Scheduler] 台股軌道同步警示:', msg);
            }
          }

          // 軌道 2：美股每日盤後同步 (獨立水位線，絕不干擾台股)
          if (plan.runUsDaily) {
            const usLane = bumpLaneAttempt('usDaily', tp.isoDate);
            try {
              const runUsFn =
                handlers.runUsDailySync ||
                ((dbPath, ctx) => {
                  const { runUsMarketSync } = require('./sync-us-market.cjs');
                  return runUsMarketSync({
                    mode: 'daily',
                    customDbPath: dbPath,
                    currentDate: ctx.now,
                    writeStaticCache: false,
                    skipMacroCadence: true,
                  });
                });
              const usRes = await runUsFn(customDbPath, { now, freshness });
              usLane.status = 'ok';
              usLane.watermarkDate = usRes?.date || freshness?.us?.anchorDate || tp.isoDate;
              usLane.lastError = null;
              tasks.usDaily = { ok: true, ...(usRes || {}) };
            } catch (err) {
              const msg = err?.message || String(err);
              usLane.status = 'error';
              usLane.lastError = msg;
              tasks.usDaily = { ok: false, error: msg };
              console.warn('[NAS Scheduler] 美股軌道同步警示:', msg);
            }
          }

          if (tasks.twDaily || tasks.usDaily) {
            const dailyOk =
              (!tasks.twDaily || tasks.twDaily.ok) && (!tasks.usDaily || tasks.usDaily.ok);
            tasks.daily = { ok: dailyOk };
          }
        }

        // 軌道 3：宏觀情緒同步 (獨立隔離，同日已完成不重跑)
        if (plan.runMacro) {
          const macroLane = bumpLaneAttempt('macro', tp.isoDate);
          try {
            const runMacroFn =
              handlers.runMacroSync ||
              (async (dbPath) => {
                const { fetchMacroSentimentDaily, ingestMacroSentimentToDb } = require('./ingest-macro-sentiment.cjs');
                const data = await fetchMacroSentimentDaily({ fredApiKey: process.env.FRED_API_KEY || undefined });
                return { ok: ingestMacroSentimentToDb(data, dbPath), date: data?.date };
              });
            const macroResult = await runMacroFn(customDbPath);
            lastRunState.lastMacroIsoDate = tp.isoDate;
            macroLane.status = 'ok';
            macroLane.watermarkDate = tp.isoDate;
            macroLane.lastError = null;
            tasks.macro = { ok: true, ...(macroResult || {}) };
          } catch (err) {
            const msg = err?.message || String(err);
            macroLane.status = 'error';
            macroLane.lastError = msg;
            tasks.macro = { ok: false, error: msg };
            console.warn('[NAS Scheduler] 每日宏觀同步警示:', msg);
          }
        }

        // 軌道 4：每週全市場湖倉維護與滾動快照備份 (獨立隔離)
        if (plan.runWeekly) {
          const weeklyLane = bumpLaneAttempt('weekly', tp.isoDate);
          try {
            const runWeeklyFn = handlers.runWeeklyLakehouseSync || runWeeklyLakehouseSync;
            await runWeeklyFn({ customDbPath, now });
            lastRunState.lastWeeklyIsoDate = tp.isoDate;
            weeklyLane.status = 'ok';
            weeklyLane.watermarkDate = tp.isoDate;
            weeklyLane.lastError = null;
            tasks.weekly = { ok: true };

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
            const msg = err?.message || String(err);
            weeklyLane.status = 'error';
            weeklyLane.lastError = msg;
            tasks.weekly = { ok: false, error: msg };
            console.warn('[NAS Scheduler] 每週全市場湖倉同步警示:', msg);
          }
        }

        return { skipped: false, triggered: true, plan, tasks };
      });

      if (lockOutcome.skipped) {
        return { skipped: true, reason: lockOutcome.reason, lockOwner: lockOutcome.lockOwner };
      }
      return lockOutcome.result;
    } catch (err) {
      console.warn('[NAS Scheduler] 排程巡檢異常 (已隔離，不影響服務):', err?.message || err);
      return { skipped: false, triggered: false, error: err?.message || err };
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
    getState: () => ({
      isRunning,
      lastDailyIsoDate: lastRunState.lastDailyIsoDate,
      lastWeeklyIsoDate: lastRunState.lastWeeklyIsoDate,
      lastMacroIsoDate: lastRunState.lastMacroIsoDate,
      latestBackup: lastRunState.latestBackup,
      lanes: {
        twDaily: { ...lastRunState.lanes.twDaily },
        usDaily: { ...lastRunState.lanes.usDaily },
        macro: { ...lastRunState.lanes.macro },
        weekly: { ...lastRunState.lanes.weekly },
      },
    }),
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
