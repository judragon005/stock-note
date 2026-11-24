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
  HISTORICAL_MARKET_HEALTH_THRESHOLDS,
  MARKET_SETTLEMENT_CUTOFFS,
} = require('./sync-thresholds.cjs');
const {
  getTimeZoneParts,
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
const PHASE1_MAX_DAILY_ATTEMPTS = 3;
const LANE_KEYS = ['twDaily', 'usDaily', 'macro', 'weekly'];
const BUDGET_KEYS = ['twDaily', 'twPhase1', 'usDaily', 'macro', 'weekly'];

let activeLock = null;

function createEmptyRetryMap() {
  return {
    twDaily: { isoDate: null, count: 0, lastAttemptAt: 0 },
    twPhase1: { isoDate: null, count: 0, lastAttemptAt: 0 },
    usDaily: { isoDate: null, count: 0, lastAttemptAt: 0 },
    macro: { isoDate: null, count: 0, lastAttemptAt: 0 },
    weekly: { isoDate: null, count: 0, lastAttemptAt: 0 },
  };
}

let laneRetryState = createEmptyRetryMap();

/**
 * 複用 market-freshness-service 之 Asia/Taipei 時區分量解析
 */
function getTaipeiClock(now = new Date()) {
  const tz = getTimeZoneParts(now, 'Asia/Taipei');
  return {
    year: tz.year,
    month: tz.month,
    day: tz.day,
    hour: tz.hour,
    minute: tz.minute,
    totalMins: tz.totalMins,
    dayOfWeek: tz.dayOfWeek,
    isoDate: tz.ymd,
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

/**
 * 全域同行程單飛互斥鎖：防止排程、追趕與手動回補併發寫入 SQLite（僅於 finally 釋放）
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
  const key = BUDGET_KEYS.includes(lane) ? lane : 'twDaily';
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
    freshnessOverride = null,
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
  const freshness = freshnessOverride || checkMarketFreshness(db, now);

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

function isTwDayResultComplete(res, { isAnchorDate = true } = {}) {
  if (!res || res.hasError || res.partial || res.phase === 'PHASE_1_PRICE_ONLY') {
    return false;
  }
  if (res.cached) return true;
  if (!res.isTradingDay) return false;
  const marginMin = isAnchorDate
    ? MARKET_HEALTH_THRESHOLDS.MARGIN_COUNT_MIN
    : HISTORICAL_MARKET_HEALTH_THRESHOLDS.TWSE_MARGIN_COUNT_MIN;
  const valMin = isAnchorDate
    ? MARKET_HEALTH_THRESHOLDS.VALUATION_COUNT_MIN
    : HISTORICAL_MARKET_HEALTH_THRESHOLDS.TWSE_VALUATION_COUNT_MIN;
  const quotesOk = Number(res.quotesCount ?? 0) >= MARKET_HEALTH_THRESHOLDS.STOCK_COUNT_MIN;
  const chipsOk = Number(res.chipsCount ?? 0) >= MARKET_HEALTH_THRESHOLDS.FRESHNESS_CHIPS_COUNT_MIN;
  const marginOk = Number(res.marginCount ?? 0) >= marginMin;
  const sblOk = Number(res.sblCount ?? 0) >= MARKET_HEALTH_THRESHOLDS.SBL_COUNT_MIN;
  const dayTradeOk = Number(res.dayTradeCount ?? 0) >= MARKET_HEALTH_THRESHOLDS.DAY_TRADE_COUNT_MIN;
  const valuationOk = Number(res.valuationCount ?? 0) >= valMin;
  return quotesOk && chipsOk && marginOk && sblOk && dayTradeOk && valuationOk;
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

  // Phase 1 (14:40~16:29 TPE) 僅先行寫入價量，獨立配額節流，絕不消耗 16:30 Phase 2 的每日 4 次配額
  const isPhase1Window = plan.phase === 'PHASE_1_PRICE_ONLY';
  const budgetLane = isPhase1Window ? 'twPhase1' : 'twDaily';
  const effectiveMaxRetries = isPhase1Window ? PHASE1_MAX_DAILY_ATTEMPTS : maxRetries;

  const budget = checkLaneRetryBudget(budgetLane, tp.isoDate, nowMs, {
    maxRetries: effectiveMaxRetries,
    retryCooldownMs,
    force,
  });

  if (!budget.allowed) {
    return {
      ok: false,
      skipped: true,
      aborted: false,
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

  recordLaneAttempt(budgetLane, tp.isoDate, nowMs);

  const ingestFn = handlers.fetchAndIngestTwDailyData || fetchAndIngestTwDailyData;
  const navFn = handlers.fetchAndIngestEtfDailyNav || fetchAndIngestEtfDailyNav;

  const reconciledDates = [];
  const failedDates = [];
  let anyPartial = false;
  let aborted = Boolean(signal && signal.aborted);

  try {
    for (const dateStr of plan.reconcileDates) {
      if (signal && signal.aborted) {
        aborted = true;
        break;
      }

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

        if (signal && signal.aborted) {
          aborted = true;
          break;
        }

        if (isTodayPhase1 && res && !res.hasError && (res.partial || res.phase === 'PHASE_1_PRICE_ONLY')) {
          anyPartial = true;
          reconciledDates.push(dateStr);
        } else if (isTwDayResultComplete(res, { isAnchorDate: dateStr === plan.anchorDate })) {
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
        if (signal && signal.aborted) {
          aborted = true;
          break;
        }
        failedDates.push({ date: dateStr, reason: err?.message || String(err) });
      }
    }

    // 補齊最新結算日／今日 Phase 1 的 ETF 每日淨值
    const needNav =
      !aborted &&
      (plan.missingPlanes.includes('etf_nav') ||
        reconciledDates.includes(plan.anchorDate) ||
        (plan.phase === 'PHASE_1_PRICE_ONLY' && reconciledDates.includes(plan.todayIso)));
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

    const etfNavFailed = Boolean(
      needNav && plan.phase === 'PHASE_2_FULL' && etfNavResult && etfNavResult.success === false
    );

    const canAdvanceWatermark =
      !aborted &&
      plan.phase !== 'PHASE_1_PRICE_ONLY' &&
      !anyPartial &&
      !etfNavFailed &&
      failedDates.length === 0;

    return {
      ok: !aborted && !etfNavFailed && failedDates.length === 0,
      skipped: false,
      aborted,
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
