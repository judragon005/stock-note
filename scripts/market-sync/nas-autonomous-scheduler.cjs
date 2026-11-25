/**
 * nas-autonomous-scheduler.cjs
 * NAS 24/7 無人值守伺服器內建自治排程器 (Spec 0242 / Spec 0243 / Spec 0246 / Spec 0248)
 * 無需使用者開啟瀏覽器網頁，常駐伺服器依台北時間 (UTC+8) 與湖倉新鮮度自動觸發四軌獨立水位線排程：
 * - twDaily：台股近 30 日缺口調諧 + 兩階段盤後容錯收斂
 * - usDaily：美股每日盤後同步（獨立水位線，絕不鎖死台股午後同步）
 * - macro：每日宏觀情緒與殖利率同步（獨立隔離）
 * - weekly：每週集保、ETF 元數據／淨值、除權息、月營收與滾動備份
 *
 * Spec 0248 (Debt 0065 + Debt 0066)：
 * - 單一重試與水位線帳本全面收斂至 lakehouse-sync-coordinator.cjs (SQLite scheduler_lane_state)，
 *   排程器改採唯讀查詢，徹底消除雙重帳本與手動回扣。
 * - 拆解四軌視窗決策純函式與獨立分軌執行器，降低圈複雜度並維持 100% 公開介面相容。
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
const { MARKET_SETTLEMENT_CUTOFFS, MARKET_HEALTH_THRESHOLDS } = require('./sync-thresholds.cjs');
const {
  getTaipeiClock,
  withGlobalSyncLock,
  recordLaneAttempt,
  updateLaneExecutionState,
  getLaneStateSnapshot,
  computeTwReconciliationPlan,
  reconcileTwLakehouse,
  resolveTwPostClosePhase,
} = require('./lakehouse-sync-coordinator.cjs');

const DEFAULT_TICK_MS = 30 * 60 * 1000; // 每 30 分鐘檢查一次
const DEFAULT_BACKUP_KEEP = 2;
const BACKUP_NAME_PATTERN = /^(.+)\.backup-(\d{8})\.db$/;

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

// ---------------------------------------------------------------------------
// 四軌獨立視窗決策純函式 (Spec 0248 T04)
// ---------------------------------------------------------------------------

function evaluateWeeklyLaneDecision(tp, freshness, lastRunState, maxRetries) {
  const lanes = lastRunState.lanes || null;
  const isSaturdayMorningWindow = tp.dayOfWeek === 6 && tp.hour >= 10;
  const isWeeklyDataStale = Boolean(freshness?.tdcc?.isStale || freshness?.revenue?.isStale);
  const weeklyDoneToday =
    lanes?.weekly?.lastRunIsoDate === tp.isoDate && lanes?.weekly?.status === 'ok';
  const legacyWeeklyDone = !lanes && lastRunState.lastWeeklyIsoDate === tp.isoDate;
  const weeklyRetries = getLaneRetryCountForDate(lanes?.weekly, tp.isoDate);
  if ((isSaturdayMorningWindow || isWeeklyDataStale) && !weeklyDoneToday && !legacyWeeklyDone && weeklyRetries < maxRetries) {
    return {
      run: true,
      reason: isSaturdayMorningWindow ? 'SATURDAY_WEEKLY_WINDOW' : 'WEEKLY_DATA_STALE',
    };
  }
  return { run: false, reason: null };
}

function evaluateTwDailyLaneDecision(nowDate, tp, freshness, lastRunState, twPlan, maxRetries) {
  const lanes = lastRunState.lanes || null;
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
    const reason =
      twPhase1Eligible && !twIsStale
        ? 'TW_PHASE1_WINDOW'
        : twHasHistoricalGaps
          ? 'TW_GAP_RECONCILE'
          : 'TW_DAILY_STALE';
    return { run: true, reason };
  }
  return { run: false, reason: null };
}

function evaluateUsDailyLaneDecision(tp, freshness, lastRunState, maxRetries) {
  const lanes = lastRunState.lanes || null;
  const usAnchor = freshness?.us?.anchorDate || null;
  const usIsStale = Boolean(freshness?.us?.isStale);
  const usWatermarkDone = Boolean(
    usAnchor && lanes?.usDaily?.watermarkDate === usAnchor && lanes?.usDaily?.status === 'ok'
  );
  const legacyDailyBlocked = !lanes && lastRunState.lastDailyIsoDate === tp.isoDate;
  const usRetries = getLaneRetryCountForDate(lanes?.usDaily, tp.isoDate);
  if (usIsStale && !usWatermarkDone && !legacyDailyBlocked && usRetries < maxRetries) {
    return { run: true, reason: 'US_DAILY_STALE' };
  }
  return { run: false, reason: null };
}

function evaluateMacroLaneDecision(tp, lastRunState, runDaily, maxRetries) {
  const lanes = lastRunState.lanes || null;
  const macroDoneToday =
    lanes?.macro?.watermarkDate === tp.isoDate ||
    lastRunState.lastMacroIsoDate === tp.isoDate;
  const macroNeedsRetry = Boolean(
    lanes?.macro?.lastRunIsoDate === tp.isoDate && lanes?.macro?.status === 'error'
  );
  const macroRetries = getLaneRetryCountForDate(lanes?.macro, tp.isoDate);
  if ((runDaily || macroNeedsRetry) && !macroDoneToday && macroRetries < maxRetries) {
    return {
      run: true,
      reason: macroNeedsRetry && !runDaily ? 'MACRO_RETRY' : null,
    };
  }
  return { run: false, reason: null };
}

/**
 * 決定當前時間點應觸發何種自動更新任務 (純函式，Spec 0246 四軌獨立水位線 / Spec 0248 分軌純函式組裝)
 */
function evaluateScheduleWindow(nowDate, freshness, lastRunState = {}, twPlan = null) {
  const tp = getTaipeiTimeParts(nowDate);
  const maxRetries = MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE;

  const weekly = evaluateWeeklyLaneDecision(tp, freshness, lastRunState, maxRetries);
  const twDaily = evaluateTwDailyLaneDecision(nowDate, tp, freshness, lastRunState, twPlan, maxRetries);
  const usDaily = evaluateUsDailyLaneDecision(tp, freshness, lastRunState, maxRetries);
  const runDaily = twDaily.run || usDaily.run;
  const macro = evaluateMacroLaneDecision(tp, lastRunState, runDaily, maxRetries);

  const reasons = [weekly.reason, twDaily.reason, usDaily.reason, macro.reason].filter(Boolean);

  return {
    runTwDaily: twDaily.run,
    runUsDaily: usDaily.run,
    runMacro: macro.run,
    runWeekly: weekly.run,
    runDaily,
    reason: reasons.length > 0 ? reasons.join('+') : 'UP_TO_DATE',
  };
}

// ---------------------------------------------------------------------------
// 四軌獨立執行輔助函式 (Spec 0248 T05 — 單一帳本 SSOT，零手動回扣)
// ---------------------------------------------------------------------------

async function executeTwDailyLane({ customDbPath, now, tp, freshness, handlers }) {
  const hasCustomHandler = typeof handlers.runTwDailySync === 'function';
  const nowMs = now.getTime();
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
    const phase = twRes?.phase || resolveTwPostClosePhase(now);

    if (twRes && twRes.skipped) {
      if (twRes.inCooldown) {
        updateLaneExecutionState(
          'twDaily',
          { status: 'cooldown_skipped', phase, lastError: twRes.reason || 'TW_SKIPPED', updatedAt: nowMs },
          customDbPath
        );
      } else {
        updateLaneExecutionState(
          'twDaily',
          {
            status: twRes.budgetExhausted ? 'budget_exhausted' : 'skipped',
            phase,
            lastError: twRes.reason || 'TW_SKIPPED',
            updatedAt: nowMs,
          },
          customDbPath
        );
      }
    } else if (twRes && twRes.phase === 'PHASE_1_PRICE_ONLY' && twRes.ok !== false) {
      // Phase 1 不消耗 Phase 2 每日重試配額，直接標記階段不增 twDaily retryCount
      updateLaneExecutionState(
        'twDaily',
        {
          lastRunIsoDate: tp.isoDate,
          phase: 'PHASE_1_PRICE_ONLY',
          status: 'phase1_pending_chips',
          lastError: null,
          updatedAt: nowMs,
        },
        customDbPath
      );
    } else {
      if (hasCustomHandler) {
        recordLaneAttempt('twDaily', tp.isoDate, nowMs, { customDbPath });
      }
      if (twRes && twRes.ok !== false && twRes.watermarkAdvanced !== false) {
        updateLaneExecutionState(
          'twDaily',
          {
            lastRunIsoDate: tp.isoDate,
            phase,
            status: 'ok',
            watermarkDate: twRes.watermarkDate || freshness?.tw?.anchorDate || tp.isoDate,
            lastError: null,
            updatedAt: nowMs,
          },
          customDbPath
        );
      } else {
        updateLaneExecutionState(
          'twDaily',
          {
            lastRunIsoDate: tp.isoDate,
            phase,
            status: 'partial_or_retry',
            lastError: twRes?.reason || twRes?.error || 'TW_INCOMPLETE',
            updatedAt: nowMs,
          },
          customDbPath
        );
      }
    }
    return { ok: twRes?.ok !== false, ...(twRes || {}) };
  } catch (err) {
    if (hasCustomHandler) {
      recordLaneAttempt('twDaily', tp.isoDate, nowMs, { customDbPath });
    }
    const msg = err?.message || String(err);
    updateLaneExecutionState(
      'twDaily',
      { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs },
      customDbPath
    );
    console.warn('[NAS Scheduler] 台股軌道同步警示:', msg);
    return { ok: false, error: msg };
  }
}

async function executeUsDailyLane({ customDbPath, now, tp, freshness, handlers }) {
  const nowMs = now.getTime();
  recordLaneAttempt('usDaily', tp.isoDate, nowMs, { customDbPath });
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
    const usSuccessCount = Number(usRes?.successCount || 0);
    const usSkippedCount = Number(usRes?.skippedCount || 0);
    const usFailCount = Number(usRes?.failCount || 0);
    const inferredTotal = usSuccessCount + usSkippedCount + usFailCount;
    const usTotalTargets = Number(usRes?.totalTargets ?? usRes?.total ?? inferredTotal);
    const hasCountStats = Boolean(
      usRes &&
      (usRes.totalTargets !== undefined ||
        usRes.total !== undefined ||
        usRes.successCount !== undefined ||
        usRes.failCount !== undefined)
    );
    const usLowCoverageFailure = Boolean(
      hasCountStats &&
      !usRes?.skipped &&
      (usTotalTargets <= 0 ||
        (usSuccessCount + usSkippedCount) / usTotalTargets < MARKET_HEALTH_THRESHOLDS.US_DAILY_MIN_SUCCESS_RATIO)
    );
    const usOk = Boolean(
      usRes && usRes.ok !== false && !usRes.circuitBroken && !usRes.aborted && !usLowCoverageFailure
    );
    if (usOk) {
      updateLaneExecutionState(
        'usDaily',
        {
          lastRunIsoDate: tp.isoDate,
          status: 'ok',
          watermarkDate: usRes?.date || freshness?.us?.anchorDate || tp.isoDate,
          lastError: null,
          updatedAt: nowMs,
        },
        customDbPath
      );
    } else {
      const reason =
        usRes?.error ||
        (usRes?.circuitBroken
          ? 'US_429_CIRCUIT_BROKEN'
          : usRes?.aborted
            ? 'US_ABORTED'
            : usLowCoverageFailure
              ? 'US_LOW_COVERAGE_RATIO'
              : 'US_SYNC_FAILED');
      updateLaneExecutionState(
        'usDaily',
        { lastRunIsoDate: tp.isoDate, status: 'error', lastError: reason, updatedAt: nowMs },
        customDbPath
      );
    }
    return { ...(usRes || {}), ok: usOk };
  } catch (err) {
    const msg = err?.message || String(err);
    updateLaneExecutionState(
      'usDaily',
      { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs },
      customDbPath
    );
    console.warn('[NAS Scheduler] 美股軌道同步警示:', msg);
    return { ok: false, error: msg };
  }
}

async function executeMacroLane({ customDbPath, now, tp, handlers, metaState }) {
  const nowMs = now.getTime();
  recordLaneAttempt('macro', tp.isoDate, nowMs, { customDbPath });
  try {
    const runMacroFn =
      handlers.runMacroSync ||
      (async (dbPath) => {
        const { fetchMacroSentimentDaily, ingestMacroSentimentToDb } = require('./ingest-macro-sentiment.cjs');
        const data = await fetchMacroSentimentDaily({
          now,
          fredApiKey: process.env.FRED_API_KEY || undefined,
        });
        return { ok: ingestMacroSentimentToDb(data, dbPath), date: data?.date };
      });
    const macroResult = await runMacroFn(customDbPath);
    const macroOk = macroResult === undefined ? true : macroResult?.ok !== false;
    if (macroOk) {
      metaState.lastMacroIsoDate = tp.isoDate;
      updateLaneExecutionState(
        'macro',
        {
          lastRunIsoDate: tp.isoDate,
          status: 'ok',
          watermarkDate: tp.isoDate,
          lastError: null,
          updatedAt: nowMs,
        },
        customDbPath
      );
    } else {
      updateLaneExecutionState(
        'macro',
        {
          lastRunIsoDate: tp.isoDate,
          status: 'error',
          lastError: macroResult?.error || 'MACRO_INGEST_FAILED',
          updatedAt: nowMs,
        },
        customDbPath
      );
    }
    return { ...(macroResult || {}), ok: macroOk };
  } catch (err) {
    const msg = err?.message || String(err);
    updateLaneExecutionState(
      'macro',
      { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs },
      customDbPath
    );
    console.warn('[NAS Scheduler] 每日宏觀同步警示:', msg);
    return { ok: false, error: msg };
  }
}

async function executeWeeklyLane({ customDbPath, now, tp, handlers, metaState }) {
  const nowMs = now.getTime();
  recordLaneAttempt('weekly', tp.isoDate, nowMs, { customDbPath });
  try {
    const runWeeklyFn = handlers.runWeeklyLakehouseSync || runWeeklyLakehouseSync;
    const weeklyReport = await runWeeklyFn({ customDbPath, now });
    const weeklyOk = isWeeklyReportOk(weeklyReport);
    if (!weeklyOk) {
      updateLaneExecutionState(
        'weekly',
        {
          lastRunIsoDate: tp.isoDate,
          status: 'error',
          lastError: 'WEEKLY_SUBTASK_FAILED',
          updatedAt: nowMs,
        },
        customDbPath
      );
      return { weekly: { ok: false, report: weeklyReport }, backup: null };
    }

    metaState.lastWeeklyIsoDate = tp.isoDate;
    updateLaneExecutionState(
      'weekly',
      {
        lastRunIsoDate: tp.isoDate,
        status: 'ok',
        watermarkDate: tp.isoDate,
        lastError: null,
        updatedAt: nowMs,
      },
      customDbPath
    );

    const runBackupFn = handlers.createRollingBackup || createRollingBackup;
    const backupResult = runBackupFn({ dbPath: customDbPath, now });
    if (backupResult?.ok) {
      metaState.latestBackup = {
        fileName: backupResult.fileName,
        path: backupResult.path,
        sizeBytes: backupResult.sizeBytes,
        createdAt: now.toISOString(),
      };
    }
    return { weekly: { ok: true, report: weeklyReport }, backup: backupResult };
  } catch (err) {
    const msg = err?.message || String(err);
    updateLaneExecutionState(
      'weekly',
      { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs },
      customDbPath
    );
    console.warn('[NAS Scheduler] 每週全市場湖倉同步警示:', msg);
    return { weekly: { ok: false, error: msg }, backup: null };
  }
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
  const effectiveDbPath = getDbPath(customDbPath);
  const metaState = {
    lastDailyIsoDate: null,
    lastWeeklyIsoDate: null,
    lastMacroIsoDate: null,
    latestBackup: null,
  };

  function readCurrentStateSnapshot(now = nowFn()) {
    const tp = getTaipeiTimeParts(now);
    const lanes = getLaneStateSnapshot(tp.isoDate, effectiveDbPath);
    return {
      lastDailyIsoDate: metaState.lastDailyIsoDate,
      lastWeeklyIsoDate: metaState.lastWeeklyIsoDate || (lanes.weekly.status === 'ok' ? lanes.weekly.watermarkDate : null),
      lastMacroIsoDate: metaState.lastMacroIsoDate || (lanes.macro.status === 'ok' ? lanes.macro.watermarkDate : null),
      latestBackup: metaState.latestBackup,
      lanes,
    };
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
          try {
            twPlan = computeTwReconciliationPlan(customDbPath, { now, freshnessOverride: freshness });
          } catch {
            twPlan = null;
          }
        }
        const currentState = readCurrentStateSnapshot(now);
        const plan = evaluateScheduleWindow(now, freshness, currentState, twPlan);
        const tasks = {};

        if (!plan.runTwDaily && !plan.runUsDaily && !plan.runMacro && !plan.runWeekly) {
          return { skipped: false, triggered: false, plan, tasks };
        }

        // 相容舊版單一 handlers.runDailySync 注入（如 Spec 0243 Slice 4 測試）
        if (plan.runDaily && typeof handlers.runDailySync === 'function') {
          const nowMs = now.getTime();
          recordLaneAttempt('twDaily', tp.isoDate, nowMs, { customDbPath: effectiveDbPath });
          recordLaneAttempt('usDaily', tp.isoDate, nowMs, { customDbPath: effectiveDbPath });
          try {
            await handlers.runDailySync(customDbPath);
            metaState.lastDailyIsoDate = tp.isoDate;
            updateLaneExecutionState(
              'twDaily',
              { lastRunIsoDate: tp.isoDate, status: 'ok', watermarkDate: freshness?.tw?.anchorDate || tp.isoDate, lastError: null, updatedAt: nowMs },
              effectiveDbPath
            );
            updateLaneExecutionState(
              'usDaily',
              { lastRunIsoDate: tp.isoDate, status: 'ok', watermarkDate: freshness?.us?.anchorDate || tp.isoDate, lastError: null, updatedAt: nowMs },
              effectiveDbPath
            );
            tasks.daily = { ok: true };
          } catch (err) {
            const msg = err?.message || String(err);
            updateLaneExecutionState('twDaily', { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs }, effectiveDbPath);
            updateLaneExecutionState('usDaily', { lastRunIsoDate: tp.isoDate, status: 'error', lastError: msg, updatedAt: nowMs }, effectiveDbPath);
            tasks.daily = { ok: false, error: msg };
            console.warn('[NAS Scheduler] 每日增量同步警示:', msg);
          }
        } else {
          if (plan.runTwDaily) {
            tasks.twDaily = await executeTwDailyLane({ customDbPath: effectiveDbPath, now, tp, freshness, handlers });
          }
          if (plan.runUsDaily) {
            tasks.usDaily = await executeUsDailyLane({ customDbPath: effectiveDbPath, now, tp, freshness, handlers });
          }
          if (tasks.twDaily || tasks.usDaily) {
            const dailyOk =
              (!tasks.twDaily || tasks.twDaily.ok) && (!tasks.usDaily || tasks.usDaily.ok);
            tasks.daily = { ok: dailyOk };
          }
        }

        if (plan.runMacro) {
          tasks.macro = await executeMacroLane({ customDbPath: effectiveDbPath, now, tp, handlers, metaState });
        }

        if (plan.runWeekly) {
          const weeklyOut = await executeWeeklyLane({ customDbPath: effectiveDbPath, now, tp, handlers, metaState });
          tasks.weekly = weeklyOut.weekly;
          if (weeklyOut.backup) {
            tasks.backup = weeklyOut.backup;
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
    getState: () => {
      const snap = readCurrentStateSnapshot();
      return {
        isRunning,
        lastDailyIsoDate: snap.lastDailyIsoDate,
        lastWeeklyIsoDate: snap.lastWeeklyIsoDate,
        lastMacroIsoDate: snap.lastMacroIsoDate,
        latestBackup: snap.latestBackup,
        lanes: {
          twDaily: { ...snap.lanes.twDaily },
          usDaily: { ...snap.lanes.usDaily },
          macro: { ...snap.lanes.macro },
          weekly: { ...snap.lanes.weekly },
        },
      };
    },
  };
}

module.exports = {
  DEFAULT_TICK_MS,
  DEFAULT_BACKUP_KEEP,
  getTaipeiTimeParts,
  evaluateWeeklyLaneDecision,
  evaluateTwDailyLaneDecision,
  evaluateUsDailyLaneDecision,
  evaluateMacroLaneDecision,
  evaluateScheduleWindow,
  createRollingBackup,
  startNasAutonomousScheduler,
};
