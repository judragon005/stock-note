/**
 * lakehouse-sync-coordinator.cjs
 * 單一湖倉同步調諧中樞 (Spec 0246 Tickets 03 & 04)
 *
 * 職責：
 * 1. 全域同行程互斥鎖 (withGlobalSyncLock) — 消除 NAS 排程、Vite 中介層追趕、手動回補併發衝突
 * 2. 近 30 個日曆日缺口集合計算 (computeTwReconciliationPlan) — 合併完全缺失日與半殘日並升冪排序
 * 3. 台股盤後兩階段容錯收斂 (reconcileTwLakehouse) — 14:40 Phase 1 價量寫入 / 16:30 Phase 2 全量收斂與水位線推進
 * 4. 分軌每日重試配額與冷卻管控 (MAX_DAILY_RETRIES_PER_LANE = 4) + 即時遙測快照
 */

const {
  initSqliteLakehouseDb,
  getDbPath,
  clearBreadthAnchorCache,
} = require('./sqlite-db-core.cjs');
const {
  MARKET_HEALTH_THRESHOLDS,
  MARKET_SETTLEMENT_CUTOFFS,
} = require('./sync-thresholds.cjs');
const {
  checkMarketFreshness,
  getMarketAnchorDate,
} = require('./market-freshness-service.cjs');
const { isTradingDay } = require('./trading-calendar-engine.cjs');
const {
  detectTwDateGaps,
  fetchAndIngestTwDailyData,
} = require('./backfill-tw-history-web.cjs');
const { fetchAndIngestEtfDailyNav } = require('./ingest-macro-sentiment.cjs');

const DEFAULT_RETRY_COOLDOWN_MS = 10 * 60 * 1000;
const LANE_KEYS = ['twDaily', 'usDaily', 'macro', 'weekly'];

let activeLock = null;

function createEmptyRetryMap() {
  return {
    twDaily: { isoDate: null, count: 0, lastAttemptAt: 0 },
    usDaily: { isoDate: null, count: 0, lastAttemptAt: 0 },
    macro: { isoDate: null, count: 0, lastAttemptAt: 0 },
    weekly: { isoDate: null, count: 0, lastAttemptAt: 0 },
  };
}

let laneRetryState = createEmptyRetryMap();

/**
 * 以 Intl.DateTimeFormat 鎖定 Asia/Taipei 取得日期與時間分量 (hourCycle: 'h23')
 */
function getTaipeiClock(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(now);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const isoDate = `${year}-${mm}-${dd}`;
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    hour,
    minute,
    totalMins: hour * 60 + minute,
    dayOfWeek,
    isoDate,
  };
}

function getCoordinatorLockState() {
  if (!activeLock) {
    return { locked: false, owner: null, lane: null, startedAt: null };
  }
  return {
    locked: true,
    owner: activeLock.owner,
    lane: activeLock.lane,
    startedAt: activeLock.startedAt,
  };
}

function isGlobalSyncLocked() {
  return Boolean(activeLock);
}

function releaseGlobalSyncLockByOwner(owner) {
  if (activeLock && activeLock.owner === owner) {
    activeLock = null;
    return true;
  }
  return false;
}

/**
 * 全域同行程單飛互斥鎖：防止排程、追趕與手動回補併發寫入 SQLite
 */
async function withGlobalSyncLock(owner, fn, { lane = 'all' } = {}) {
  if (activeLock) {
    return {
      skipped: true,
      reason: 'LOCKED',
      lockOwner: activeLock.owner,
      startedAt: activeLock.startedAt,
    };
  }
  const token = {
    owner: String(owner || 'unknown'),
    lane: String(lane || 'all'),
    startedAt: Date.now(),
  };
  activeLock = token;
  try {
    const result = await fn();
    return { skipped: false, result };
  } finally {
    if (activeLock === token) {
      activeLock = null;
    }
  }
}

function getOrResetLaneBudget(lane, taipeiIsoDate) {
  const key = LANE_KEYS.includes(lane) ? lane : 'twDaily';
  const entry = laneRetryState[key];
  if (entry.isoDate !== taipeiIsoDate) {
    entry.isoDate = taipeiIsoDate;
    entry.count = 0;
    entry.lastAttemptAt = 0;
  }
  return entry;
}

function checkLaneRetryBudget(
  lane,
  taipeiIsoDate,
  nowMs = Date.now(),
  {
    maxRetries = MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE,
    retryCooldownMs = DEFAULT_RETRY_COOLDOWN_MS,
    force = false,
  } = {}
) {
  const entry = getOrResetLaneBudget(lane, taipeiIsoDate);
  if (!force && entry.count >= maxRetries) {
    return {
      allowed: false,
      budgetExhausted: true,
      inCooldown: false,
      retryCount: entry.count,
      maxRetries,
    };
  }
  if (!force && retryCooldownMs > 0 && entry.lastAttemptAt > 0 && nowMs - entry.lastAttemptAt < retryCooldownMs) {
    return {
      allowed: false,
      budgetExhausted: false,
      inCooldown: true,
      retryCount: entry.count,
      maxRetries,
    };
  }
  return {
    allowed: true,
    budgetExhausted: false,
    inCooldown: false,
    retryCount: entry.count,
    maxRetries,
  };
}

function recordLaneAttempt(lane, taipeiIsoDate, nowMs = Date.now()) {
  const entry = getOrResetLaneBudget(lane, taipeiIsoDate);
  entry.count += 1;
  entry.lastAttemptAt = nowMs;
  return { ...entry };
}

function getLaneRetrySnapshot(taipeiIsoDate = getTaipeiClock().isoDate) {
  const snapshot = {};
  for (const lane of LANE_KEYS) {
    const entry = getOrResetLaneBudget(lane, taipeiIsoDate);
    snapshot[lane] = {
      isoDate: entry.isoDate,
      retryCount: entry.count,
      maxRetries: MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE,
      lastAttemptAt: entry.lastAttemptAt || null,
    };
  }
  return snapshot;
}

/**
 * 決定台股當日所處之盤後收斂階段
 * - INTRADAY_OR_PREOPEN: 今日開盤前或盤中 (< 14:40 TPE)
 * - PHASE_1_PRICE_ONLY: 14:40 ~ 16:29 TPE (可先行寫入收盤價量與 ETF 淨值，但不得推進水位線)
 * - PHASE_2_FULL: >= 16:30 TPE 或非交易日（驗證最新已結算交易日全量完整性）
 */
function resolveTwPostClosePhase(now = new Date()) {
  const tp = getTaipeiClock(now);
  if (!isTradingDay(tp.isoDate, 'TW')) {
    return 'PHASE_2_FULL';
  }
  if (tp.totalMins < MARKET_SETTLEMENT_CUTOFFS.TW_PHASE1_PRICE_MINUTES) {
    return 'INTRADAY_OR_PREOPEN';
  }
  if (tp.totalMins < MARKET_SETTLEMENT_CUTOFFS.TW_PHASE2_FULL_MINUTES) {
    return 'PHASE_1_PRICE_ONLY';
  }
  return 'PHASE_2_FULL';
}

/**
 * 計算台股近 N 日缺口調諧計畫（合併完全缺失日與主副表半殘日，嚴格升冪由舊至新）
 */
function computeTwReconciliationPlan(
  customDbPath,
  {
    maxLookbackDays = MARKET_SETTLEMENT_CUTOFFS.GAP_CATCHUP_LOOKBACK_DAYS,
    now = new Date(),
  } = {}
) {
  const resolvedDbPath = getDbPath(customDbPath);
  const db = initSqliteLakehouseDb(resolvedDbPath);
  const tp = getTaipeiClock(now);
  const anchorDate = getMarketAnchorDate('TW', now);
  const phase = resolveTwPostClosePhase(now);

  const gapReport = detectTwDateGaps({
    dbPath: resolvedDbPath,
    maxLookbackDays,
    customNow: now,
  });
  const freshness = checkMarketFreshness(db, now);

  const missingDates = Array.isArray(gapReport?.gapDates) ? gapReport.gapDates : [];
  const incompleteDates = Array.isArray(freshness?.tw?.incompleteDates)
    ? freshness.tw.incompleteDates
    : [];
  const missingPlanes = Array.isArray(freshness?.tw?.missingPlanes)
    ? freshness.tw.missingPlanes
    : [];

  const mergedSet = new Set();
  for (const d of missingDates) {
    if (d && d <= anchorDate && isTradingDay(d, 'TW')) mergedSet.add(d);
  }
  for (const d of incompleteDates) {
    if (d && d <= anchorDate && isTradingDay(d, 'TW')) mergedSet.add(d);
  }
  if (phase === 'PHASE_1_PRICE_ONLY' && isTradingDay(tp.isoDate, 'TW')) {
    mergedSet.add(tp.isoDate);
  }

  const reconcileDates = Array.from(mergedSet).sort((a, b) => a.localeCompare(b));

  return {
    anchorDate,
    todayIso: tp.isoDate,
    phase,
    maxLookbackDays,
    missingDates: [...missingDates].sort((a, b) => a.localeCompare(b)),
    incompleteDates: [...incompleteDates].sort((a, b) => a.localeCompare(b)),
    missingPlanes,
    reconcileDates,
    hasGaps: reconcileDates.length > 0,
    latestInDbDate: gapReport?.latestInDbDate || freshness?.tw?.latestDate || null,
  };
}

function isTwDayResultComplete(res) {
  if (!res || res.hasError || res.partial || res.phase === 'PHASE_1_PRICE_ONLY') {
    return false;
  }
  if (res.cached) return true;
  if (!res.isTradingDay) return false;
  const quotesOk = Number(res.quotesCount || 0) >= MARKET_HEALTH_THRESHOLDS.STOCK_COUNT_MIN;
  const chipsOk = Number(res.chipsCount || 0) >= MARKET_HEALTH_THRESHOLDS.FRESHNESS_CHIPS_COUNT_MIN;
  return quotesOk && chipsOk;
}

/**
 * 執行台股單一缺口調諧與兩階段盤後容錯收斂
 */
async function reconcileTwLakehouse(options = {}) {
  const {
    customDbPath,
    dbPath,
    now = new Date(),
    maxLookbackDays = MARKET_SETTLEMENT_CUTOFFS.GAP_CATCHUP_LOOKBACK_DAYS,
    throttleMs = 1000,
    retryCooldownMs = DEFAULT_RETRY_COOLDOWN_MS,
    maxRetries = MARKET_SETTLEMENT_CUTOFFS.MAX_DAILY_RETRIES_PER_LANE,
    force = false,
    signal,
    handlers = {},
  } = options;

  const resolvedDbPath = customDbPath || dbPath;
  const tp = getTaipeiClock(now);
  const nowMs = now.getTime();
  const plan = computeTwReconciliationPlan(resolvedDbPath, { maxLookbackDays, now });

  const budget = checkLaneRetryBudget('twDaily', tp.isoDate, nowMs, {
    maxRetries,
    retryCooldownMs,
    force,
  });

  if (!budget.allowed) {
    return {
      ok: false,
      skipped: true,
      reason: budget.budgetExhausted ? 'RETRY_BUDGET_EXHAUSTED' : 'RETRY_COOLDOWN',
      budgetExhausted: budget.budgetExhausted,
      inCooldown: budget.inCooldown,
      retryCount: budget.retryCount,
      maxRetries: budget.maxRetries,
      phase: plan.phase,
      anchorDate: plan.anchorDate,
      watermarkAdvanced: false,
      reconciledDates: [],
      failedDates: [],
    };
  }

  recordLaneAttempt('twDaily', tp.isoDate, nowMs);

  const ingestFn = handlers.fetchAndIngestTwDailyData || fetchAndIngestTwDailyData;
  const navFn = handlers.fetchAndIngestEtfDailyNav || fetchAndIngestEtfDailyNav;

  const reconciledDates = [];
  const failedDates = [];
  let anyPartial = false;

  try {
    for (const dateStr of plan.reconcileDates) {
      if (signal && signal.aborted) break;

      const isTodayPhase1 = plan.phase === 'PHASE_1_PRICE_ONLY' && dateStr === plan.todayIso;
      try {
        const res = await ingestFn(dateStr, {
          dbPath: resolvedDbPath,
          force: plan.incompleteDates.includes(dateStr) || force,
          throttleMs,
          latestTradingDate: plan.anchorDate,
          allowPartialPhase1: isTodayPhase1,
          signal,
        });

        if (isTodayPhase1 && res && !res.hasError && (res.partial || res.phase === 'PHASE_1_PRICE_ONLY')) {
          anyPartial = true;
          reconciledDates.push(dateStr);
        } else if (isTwDayResultComplete(res)) {
          reconciledDates.push(dateStr);
        } else {
          if (res?.partial || res?.phase === 'PHASE_1_PRICE_ONLY') {
            anyPartial = true;
          }
          failedDates.push({
            date: dateStr,
            reason: res?.errorReason || (res?.partial ? 'PHASE_1_INCOMPLETE' : 'INCOMPLETE_TW_INGEST'),
          });
        }
      } catch (err) {
        failedDates.push({ date: dateStr, reason: err?.message || String(err) });
      }
    }

    // 補齊最新結算日／今日 Phase 1 的 ETF 每日淨值
    const needNav =
      plan.missingPlanes.includes('etf_nav') ||
      reconciledDates.includes(plan.anchorDate) ||
      (plan.phase === 'PHASE_1_PRICE_ONLY' && reconciledDates.includes(plan.todayIso));
    let etfNavResult = null;
    if (needNav && typeof navFn === 'function') {
      const navTargetDate =
        plan.phase === 'PHASE_1_PRICE_ONLY' && reconciledDates.includes(plan.todayIso)
          ? plan.todayIso
          : plan.anchorDate;
      try {
        etfNavResult = await navFn(resolvedDbPath, navTargetDate);
      } catch (navErr) {
        etfNavResult = { success: false, count: 0, error: navErr?.message || String(navErr) };
      }
    }

    const canAdvanceWatermark =
      plan.phase !== 'PHASE_1_PRICE_ONLY' &&
      !anyPartial &&
      failedDates.length === 0;

    return {
      ok: failedDates.length === 0,
      skipped: false,
      budgetExhausted: false,
      inCooldown: false,
      retryCount: getOrResetLaneBudget('twDaily', tp.isoDate).count,
      maxRetries,
      phase: plan.phase,
      anchorDate: plan.anchorDate,
      watermarkAdvanced: canAdvanceWatermark,
      watermarkDate: canAdvanceWatermark ? plan.anchorDate : null,
      reconciledDates,
      failedDates,
      etfNav: etfNavResult,
      plan,
    };
  } finally {
    clearBreadthAnchorCache();
  }
}

/**
 * 取得協調中樞統一遙測快照（供 /healthz 與 /api/market/sync-status 共用）
 */
function getCoordinatorTelemetry(customDbPath, now = new Date()) {
  const tp = getTaipeiClock(now);
  let twPlan = null;
  try {
    twPlan = computeTwReconciliationPlan(customDbPath, { now });
  } catch {
    twPlan = null;
  }
  return {
    lock: getCoordinatorLockState(),
    phase: resolveTwPostClosePhase(now),
    taipeiIsoDate: tp.isoDate,
    retryBudgets: getLaneRetrySnapshot(tp.isoDate),
    twGapSummary: twPlan
      ? {
          anchorDate: twPlan.anchorDate,
          latestInDbDate: twPlan.latestInDbDate,
          missingCount: twPlan.missingDates.length,
          incompleteCount: twPlan.incompleteDates.length,
          reconcileDates: twPlan.reconcileDates,
          hasGaps: twPlan.hasGaps,
          lookbackDays: twPlan.maxLookbackDays,
        }
      : null,
  };
}

function resetCoordinatorStateForTest() {
  activeLock = null;
  laneRetryState = createEmptyRetryMap();
}

module.exports = {
  DEFAULT_RETRY_COOLDOWN_MS,
  getTaipeiClock,
  getCoordinatorLockState,
  isGlobalSyncLocked,
  releaseGlobalSyncLockByOwner,
  withGlobalSyncLock,
  checkLaneRetryBudget,
  recordLaneAttempt,
  getLaneRetrySnapshot,
  resolveTwPostClosePhase,
  computeTwReconciliationPlan,
  reconcileTwLakehouse,
  getCoordinatorTelemetry,
  resetCoordinatorStateForTest,
};
