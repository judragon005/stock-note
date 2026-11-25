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
  getTaipeiClock,
  withGlobalSyncLock,
  recordLaneAttempt,
  computeTwReconciliationPlan,
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
 * 將任意 Date 轉換為台北時間 (UTC+8) 的年月日時分與星期（複用 getTaipeiClock SSOT）
 */
function getTaipeiTimeParts(date = new Date()) {
  const tp = getTaipeiClock(date);
  return {
    year: tp.year,
    month: tp.month,
    day: tp.day,
    dayOfWeek: tp.dayOfWeek,
    hour: tp.hour,
    minute: tp.minute,
    isoDate: tp.isoDate,
  };
}

function isWeeklyReportOk(res) {
  if (res === undefined || res === null) return true; // 相容既有無回傳值之測試替身
  if (res.ok === false) return false;
  const subKeys = ['tdcc', 'corporateActions', 'monthlyRevenue', 'etfNav', 'etfMeta'];
  for (const key of subKeys) {
    if (res[key] && typeof res[key] === 'object' && res[key].ok === false) {
      return false;
    }
  }
  return true;
}

/**
 * 決定當前時間點應觸發何種自動更新任務 (純函式，Spec 0246 四軌獨立水位線，杜絕跨市場鎖死與死碼守衛)
 */
function evaluateScheduleWindow(nowDate, freshness, lastRunState = {}, twPlan = null) {
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

  // 2. 台股日線缺口調諧軌道 (區分歷史真實缺口與今日 Phase 1 寫價窗，杜絕同日重複旁路)
  const twAnchor = freshness?.tw?.anchorDate || null;
  const twIsStale = Boolean(freshness?.tw?.isStale);
  const twPhase = twPlan?.phase || resolveTwPostClosePhase(nowDate);
  const filterHistoricalDate = (d) => Boolean(d) && !(twPhase === 'PHASE_1_PRICE_ONLY' && d === tp.isoDate);
  const historicalMissing = Array.isArray(twPlan?.missingDates) ? twPlan.missingDates.filter(filterHistoricalDate) : [];
  const historicalIncomplete = Array.isArray(twPlan?.incompleteDates)
    ? twPlan.incompleteDates.filter(filterHistoricalDate)
    : [];
  const twHasHistoricalGaps = Boolean(
    historicalMissing.length > 0 ||
    historicalIncomplete.length > 0 ||
    (twPlan?.hasGaps && !Array.isArray(twPlan?.missingDates) && !Array.isArray(twPlan?.incompleteDates))
  );
  const twPhase1DoneToday = Boolean(
    lanes?.twDaily?.lastRunIsoDate === tp.isoDate && lanes?.twDaily?.phase === 'PHASE_1_PRICE_ONLY'
  );
  const twWatermarkDone = Boolean(
    twAnchor &&
    lanes?.twDaily?.watermarkDate === twAnchor &&
    lanes?.twDaily?.status === 'ok' &&
    !twHasHistoricalGaps
  );
  const twPhase1Eligible =
    twPhase === 'PHASE_1_PRICE_ONLY' &&
    !twWatermarkDone &&
    !twPhase1DoneToday;
  const twNeedsWork =
    twHasHistoricalGaps ||
    twPhase1Eligible ||
    (twIsStale && !(twPhase === 'PHASE_1_PRICE_ONLY' && twPhase1DoneToday));
  const legacyDailyBlocked = !lanes && lastRunState.lastDailyIsoDate === tp.isoDate;
  const twRetries = getLaneRetryCountForDate(lanes?.twDaily, tp.isoDate);
  if (
    twNeedsWork &&
    !twWatermarkDone &&
    !legacyDailyBlocked &&
    (twPhase1Eligible || twRetries < maxRetries)
  ) {
    actions.runTwDaily = true;
    reasons.push(
      twPhase1Eligible && !twIsStale
        ? 'TW_PHASE1_WINDOW'
        : twHasHistoricalGaps
          ? 'TW_GAP_RECONCILE'
          : 'TW_DAILY_STALE'
    );
  }

  // 3. 美股日線軌道 (獨立水位線，移除矛盾子句確保狀態機真實阻斷重複執行)
  const usAnchor = freshness?.us?.anchorDate || null;
  const usIsStale = Boolean(freshness?.us?.isStale);
  const usWatermarkDone = Boolean(
    usAnchor && lanes?.usDaily?.watermarkDate === usAnchor && lanes?.usDaily?.status === 'ok'
  );
  const usRetries = getLaneRetryCountForDate(lanes?.usDaily, tp.isoDate);
  if (usIsStale && !usWatermarkDone && !legacyDailyBlocked && usRetries < maxRetries) {
    actions.runUsDaily = true;
    reasons.push('US_DAILY_STALE');
  }

  actions.runDaily = actions.runTwDaily || actions.runUsDaily;

  // 4. 宏觀情緒軌道 (獨立追蹤：任一日更觸發或當日宏觀失敗待重試時均允許獨立重試)
  const macroDoneToday =
    lanes?.macro?.watermarkDate === tp.isoDate ||
    lastRunState.lastMacroIsoDate === tp.isoDate;
  const macroNeedsRetry = Boolean(
    lanes?.macro?.lastRunIsoDate === tp.isoDate && lanes?.macro?.status === 'error'
  );
  const macroRetries = getLaneRetryCountForDate(lanes?.macro, tp.isoDate);
  if ((actions.runDaily || macroNeedsRetry) && !macroDoneToday && macroRetries < maxRetries) {
    actions.runMacro = true;
    if (macroNeedsRetry && !actions.runDaily) {
      reasons.push('MACRO_RETRY');
    }
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
      stop: () => { },
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

  function bumpLaneAttempt(laneKey, isoDate, { syncToCoordinator = true } = {}) {
    const lane = lastRunState.lanes[laneKey];
    if (lane.lastRunIsoDate !== isoDate) {
      lane.lastRunIsoDate = isoDate;
      lane.retryCount = 0;
    }
    lane.retryCount += 1;
    lane.status = 'running';
    const attemptNow = nowFn();
    lane.updatedAt = attemptNow.toISOString();
    if (syncToCoordinator) {
      recordLaneAttempt(laneKey, isoDate, attemptNow.getTime());
    }
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
        let twPlan = null;
        if (typeof handlers.computeTwReconciliationPlan === 'function') {
          twPlan = handlers.computeTwReconciliationPlan(customDbPath, { now, freshnessOverride: freshness });
        } else if (!handlers.runDailySync && !handlers.checkMarketFreshness) {
          // 僅於未覆寫 checkMarketFreshness 測試替身時掃描 SQLite 缺口計畫，兼顧真實湖倉內部缺口偵測與單元測試隔離
          try {
            twPlan = computeTwReconciliationPlan(customDbPath, { now, freshnessOverride: freshness });
          } catch {
            twPlan = null;
          }
        }
        const plan = evaluateScheduleWindow(now, freshness, lastRunState, twPlan);
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
            const twLane = bumpLaneAttempt('twDaily', tp.isoDate, {
              syncToCoordinator: Boolean(handlers.runTwDailySync),
            });
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
              if (twRes && twRes.skipped) {
                if (twRes.inCooldown) {
                  // 冷卻略過不虛耗重試配額
                  twLane.retryCount = Math.max(0, twLane.retryCount - 1);
                  twLane.status = 'cooldown_skipped';
                } else {
                  if (twRes.phase === 'PHASE_1_PRICE_ONLY' && twRes.budgetExhausted) {
                    // Phase 1 配額耗盡不可吃掉 16:30 Phase 2 的 twDaily 配額
                    twLane.retryCount = Math.max(0, twLane.retryCount - 1);
                  }
                  twLane.status = twRes.budgetExhausted ? 'budget_exhausted' : 'skipped';
                }
                twLane.lastError = twRes.reason || 'TW_SKIPPED';
              } else if (twRes && twRes.phase === 'PHASE_1_PRICE_ONLY' && twRes.ok !== false) {
                // Phase 1 不消耗 Phase 2 每日重試配額
                twLane.retryCount = Math.max(0, twLane.retryCount - 1);
                twLane.status = 'phase1_pending_chips';
                twLane.lastError = null;
              } else if (twRes && twRes.ok !== false && twRes.watermarkAdvanced !== false) {
                twLane.status = 'ok';
                twLane.watermarkDate = twRes.watermarkDate || freshness?.tw?.anchorDate || tp.isoDate;
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

          // 軌道 2：美股每日盤後同步 (檢核實際回傳結果，靜默失敗絕不推進水位線)
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
              const usZeroProgressFailure = Boolean(
                usRes &&
                Number(usRes.failCount || 0) > 0 &&
                Number(usRes.successCount || 0) === 0 &&
                Number(usRes.skippedCount || 0) === 0 &&
                !usRes.skipped
              );
              const usOk = Boolean(
                usRes && usRes.ok !== false && !usRes.circuitBroken && !usRes.aborted && !usZeroProgressFailure
              );
              if (usOk) {
                usLane.status = 'ok';
                usLane.watermarkDate = usRes?.date || freshness?.us?.anchorDate || tp.isoDate;
                usLane.lastError = null;
              } else {
                usLane.status = 'error';
                usLane.lastError =
                  usRes?.error ||
                  (usRes?.circuitBroken
                    ? 'US_429_CIRCUIT_BROKEN'
                    : usRes?.aborted
                      ? 'US_ABORTED'
                      : 'US_SYNC_FAILED');
              }
              tasks.usDaily = { ...(usRes || {}), ok: usOk };
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

        // 軌道 3：宏觀情緒同步 (檢核 ok 狀態，失敗禁止推進水位線)
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
            const macroOk = macroResult === undefined ? true : macroResult?.ok !== false;
            if (macroOk) {
              lastRunState.lastMacroIsoDate = tp.isoDate;
              macroLane.status = 'ok';
              macroLane.watermarkDate = tp.isoDate;
              macroLane.lastError = null;
            } else {
              macroLane.status = 'error';
              macroLane.lastError = macroResult?.error || 'MACRO_INGEST_FAILED';
            }
            tasks.macro = { ...(macroResult || {}), ok: macroOk };
          } catch (err) {
            const msg = err?.message || String(err);
            macroLane.status = 'error';
            macroLane.lastError = msg;
            tasks.macro = { ok: false, error: msg };
            console.warn('[NAS Scheduler] 每日宏觀同步警示:', msg);
          }
        }

        // 軌道 4：每週全市場湖倉維護與滾動快照備份 (任一子項失敗皆禁止推進水位線與備份)
        if (plan.runWeekly) {
          const weeklyLane = bumpLaneAttempt('weekly', tp.isoDate);
          try {
            const runWeeklyFn = handlers.runWeeklyLakehouseSync || runWeeklyLakehouseSync;
            const weeklyReport = await runWeeklyFn({ customDbPath, now });
            const weeklyOk = isWeeklyReportOk(weeklyReport);
            if (!weeklyOk) {
              weeklyLane.status = 'error';
              weeklyLane.lastError = 'WEEKLY_SUBTASK_FAILED';
              tasks.weekly = { ok: false, report: weeklyReport };
            } else {
              lastRunState.lastWeeklyIsoDate = tp.isoDate;
              weeklyLane.status = 'ok';
              weeklyLane.watermarkDate = tp.isoDate;
              weeklyLane.lastError = null;
              tasks.weekly = { ok: true, report: weeklyReport };

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
      runTickNow().catch(() => { });
    }, 5000);
    if (typeof bootTimer.unref === 'function') bootTimer.unref();
  }

  const interval = setInterval(() => {
    runTickNow().catch(() => { });
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
