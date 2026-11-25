/**
 * spec0248-lakehouse-scheduler-wave1.test.cjs
 * Spec 0248 (Wave 1) 端到端契約測試：
 * - T01: SQLite 4 大高頻表日期／年月首欄索引與 EXPLAIN QUERY PLAN 零 SCAN
 * - T02: SQLite scheduler_lane_state 持久化表 Schema 與讀寫原語
 * - T06: 宏觀情緒同步台北時區定錨與全空列拒寫守衛
 * - T09: 審計日曆引擎收斂與平行台股行情櫃買權證濾除
 * (後續 Wave B/C 將持續於本檔追加 T03/04/05/07/08 契約測試)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  initSqliteLakehouseDb,
  closeSqliteDb,
  readSchedulerLaneState,
  upsertSchedulerLaneState,
  listSchedulerLaneStates,
} = require('./sqlite-db-core.cjs');
const { checkMarketFreshness } = require('./market-freshness-service.cjs');
const {
  fetchMacroSentimentDaily,
  ingestMacroSentimentToDb,
} = require('./ingest-macro-sentiment.cjs');
const { isMarketTradingDay } = require('./audit-verifier.cjs');
const { parseTpexDailyQuotes, saveTwQuotesToSqlite } = require('./ingest-tw-quotes.cjs');
const {
  checkLaneRetryBudget,
  recordLaneAttempt,
  getLaneStateSnapshot,
  updateLaneExecutionState,
  resetCoordinatorStateForTest,
} = require('./lakehouse-sync-coordinator.cjs');
const {
  startNasAutonomousScheduler,
  evaluateScheduleWindow,
} = require('./nas-autonomous-scheduler.cjs');
const { runWeeklyLakehouseSync } = require('./weekly-lakehouse-sync.cjs');
const { MARKET_HEALTH_THRESHOLDS } = require('./sync-thresholds.cjs');

function createTempDbPath(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `spec0248-${tag}-`));
  return { dir, dbPath: path.join(dir, 'lakehouse.db') };
}

function cleanupTempDir(dir) {
  try {
    closeSqliteDb();
  } catch {}
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

function getQueryPlanDetails(db, sql, ...params) {
  const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params);
  return rows.map((r) => String(r.detail || '')).join(' | ');
}

const tests = [];
function t(name, fn) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// T01: SQLite 4 大高頻表日期／年月首欄索引與 EXPLAIN QUERY PLAN 零 SCAN
// ---------------------------------------------------------------------------
t('T01: 四大高頻表應建立日期/年月首欄索引，且 checkMarketFreshness 關鍵查詢零全表 SCAN', () => {
  const { dir, dbPath } = createTempDbPath('t01');
  try {
    const db = initSqliteLakehouseDb(dbPath);

    // 確認四表均有資料列，避免空表干擾查詢計畫
    const now = Date.now();
    db.prepare(
      `INSERT INTO tw_tdcc_distribution (symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at)
       VALUES ('2330', '2026-11-20', 100000, 70, 60, 10, ?)`
    ).run(now);
    db.prepare(
      `INSERT INTO tw_monthly_revenue (symbol, year_month, revenue, last_year_revenue, yoy_rate, mom_rate, is_all_time_high, updated_at)
       VALUES ('2330', '2026-10', 250000000, 200000000, 25, 5, 1, ?)`
    ).run(now);
    db.prepare(
      `INSERT INTO tw_valuation_daily (symbol, date, pe, pb, dividend_yield, updated_at)
       VALUES ('2330', '2026-11-24', 20, 5, 2.5, ?)`
    ).run(now);
    db.prepare(
      `INSERT INTO etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at)
       VALUES ('0050', '2026-11-24', 190, 189.8, 0.11, ?)`
    ).run(now);

    const tdccPlan = getQueryPlanDetails(db, 'SELECT MAX(date) as maxDate FROM tw_tdcc_distribution');
    const revPlan = getQueryPlanDetails(db, 'SELECT MAX(year_month) as maxMonth FROM tw_monthly_revenue');
    const valPlan = getQueryPlanDetails(db, 'SELECT COUNT(*) AS count FROM tw_valuation_daily WHERE date = ?', '2026-11-24');
    const navPlan = getQueryPlanDetails(db, 'SELECT COUNT(*) AS count FROM etf_daily_nav WHERE date = ?', '2026-11-24');

    assert.ok(
      /SEARCH/i.test(tdccPlan) && !/\bSCAN\b/i.test(tdccPlan),
      `tw_tdcc_distribution 查詢不應全表 SCAN，實際: ${tdccPlan}`
    );
    assert.ok(
      /SEARCH/i.test(revPlan) && !/\bSCAN\b/i.test(revPlan),
      `tw_monthly_revenue 查詢不應全表 SCAN，實際: ${revPlan}`
    );
    assert.ok(
      /SEARCH/i.test(valPlan) && !/\bSCAN\b/i.test(valPlan),
      `tw_valuation_daily 查詢應使用索引 SEARCH，實際: ${valPlan}`
    );
    assert.ok(
      /SEARCH/i.test(navPlan) && !/\bSCAN\b/i.test(navPlan),
      `etf_daily_nav 查詢應使用索引 SEARCH，實際: ${navPlan}`
    );

    const freshness = checkMarketFreshness(db, new Date('2026-11-24T10:00:00Z'));
    assert.strictEqual(freshness.tdcc.latestDate, '2026-11-20');
    assert.strictEqual(freshness.revenue.latestMonth, '2026-10');
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T02: SQLite scheduler_lane_state 持久化表 Schema 與讀寫原語
// ---------------------------------------------------------------------------
t('T02: scheduler_lane_state 應支援跨連線重啟持久化讀寫五軌狀態', () => {
  assert.strictEqual(typeof readSchedulerLaneState, 'function', 'sqlite-db-core 應匯出 readSchedulerLaneState');
  assert.strictEqual(typeof upsertSchedulerLaneState, 'function', 'sqlite-db-core 應匯出 upsertSchedulerLaneState');
  assert.strictEqual(typeof listSchedulerLaneStates, 'function', 'sqlite-db-core 應匯出 listSchedulerLaneStates');

  const { dir, dbPath } = createTempDbPath('t02');
  try {
    initSqliteLakehouseDb(dbPath);
    upsertSchedulerLaneState(
      'twDaily',
      {
        watermarkDate: '2026-11-24',
        lastRunIsoDate: '2026-11-25',
        retryCount: 2,
        lastAttemptAt: 1764050000000,
        status: 'partial_or_retry',
        phase: 'PHASE_2_FULL',
        lastError: 'TW_INCOMPLETE',
      },
      dbPath
    );
    upsertSchedulerLaneState(
      'twPhase1',
      {
        lastRunIsoDate: '2026-11-25',
        retryCount: 1,
        lastAttemptAt: 1764048000000,
        status: 'phase1_pending_chips',
        phase: 'PHASE_1_PRICE_ONLY',
      },
      dbPath
    );

    // 模擬容器重啟：關閉連線後以相同 dbPath 重新初始化
    closeSqliteDb();
    initSqliteLakehouseDb(dbPath);

    const tw = readSchedulerLaneState('twDaily', dbPath);
    assert.ok(tw, '重啟後應讀回 twDaily 持久化記錄');
    assert.strictEqual(tw.watermarkDate, '2026-11-24');
    assert.strictEqual(tw.lastRunIsoDate, '2026-11-25');
    assert.strictEqual(tw.retryCount, 2);
    assert.strictEqual(tw.lastAttemptAt, 1764050000000);
    assert.strictEqual(tw.status, 'partial_or_retry');
    assert.strictEqual(tw.phase, 'PHASE_2_FULL');
    assert.strictEqual(tw.lastError, 'TW_INCOMPLETE');

    const all = listSchedulerLaneStates(dbPath);
    assert.strictEqual(all.twDaily.retryCount, 2);
    assert.strictEqual(all.twPhase1.retryCount, 1);
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T06: 宏觀情緒同步台北時區定錨與全空列拒寫守衛
// ---------------------------------------------------------------------------
t('T06: 宏觀同步應以台北日期定錨，且全 NULL 載荷拒寫回傳 false，單一有限數值則正常寫入', async () => {
  const { dir, dbPath } = createTempDbPath('t06');
  try {
    const db = initSqliteLakehouseDb(dbPath);

    // 1. 台北 2026-11-25 01:30 (+08:00) = UTC 2026-11-24 17:30Z，不應落回 UTC 2026-11-24
    const earlyMorningTaipei = new Date('2026-11-24T17:30:00Z');
    const offlineMacro = await fetchMacroSentimentDaily({
      now: earlyMorningTaipei,
      fetchJson: async () => null,
    });
    assert.strictEqual(
      offlineMacro.date,
      '2026-11-25',
      `台北凌晨 01:30 預設宏觀日期應為 2026-11-25，實際: ${offlineMacro.date}`
    );

    // 2. 全 NULL 物件拒寫並回傳 false，資料庫維持 0 筆
    const nullResult = ingestMacroSentimentToDb(
      {
        date: '2026-11-25',
        vixClose: null,
        treasuryYield10y: null,
        riskFreeRate3m: null,
        cnnFearGreedScore: undefined,
      },
      dbPath
    );
    assert.strictEqual(nullResult, false, '全 NULL 宏觀載荷應回傳 false 拒絕寫入');
    const rowCountAfterNull = db
      .prepare("SELECT COUNT(*) as c FROM macro_sentiment_daily WHERE date = '2026-11-25'")
      .get()?.c;
    assert.strictEqual(rowCountAfterNull, 0, '全 NULL 載荷絕不可在 macro_sentiment_daily 寫入空列');

    // 3. 至少 1 項有限數值則正常寫入並回傳 true
    const partialOk = ingestMacroSentimentToDb(
      {
        date: '2026-11-25',
        vixClose: 16.4,
      },
      dbPath
    );
    assert.strictEqual(partialOk, true, '至少 1 項有限數值應正常入庫並回傳 true');
    const saved = db
      .prepare("SELECT vix_close FROM macro_sentiment_daily WHERE date = '2026-11-25'")
      .get();
    assert.strictEqual(saved?.vix_close, 16.4);
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T09: 審計日曆引擎收斂與平行台股行情櫃買權證濾除
// ---------------------------------------------------------------------------
t('T09: audit-verifier 應委派共享休市日曆，ingest-tw-quotes 應濾除櫃買權證且保留合法 ETF', () => {
  // 2026 新增休市日（原先硬編碼於 audit-verifier.cjs 的舊表遺漏這三天）
  assert.strictEqual(
    isMarketTradingDay(new Date('2026-10-23T04:00:00Z'), 'TW'),
    false,
    '2026-10-23 (薔琵颱風停市) 應判定為非交易日'
  );
  assert.strictEqual(
    isMarketTradingDay(new Date('2026-10-26T04:00:00Z'), 'TW'),
    false,
    '2026-10-26 (光復節補假) 應判定為非交易日'
  );
  assert.strictEqual(
    isMarketTradingDay(new Date('2026-12-25T04:00:00Z'), 'TW'),
    false,
    '2026-12-25 (行憲紀念日) 應判定為非交易日'
  );

  // parseTpexDailyQuotes 與 saveTwQuotesToSqlite 應濾除 6 碼上櫃權證 (7xxxxx/70xxxx)，保留合法個股與 ETF
  const parsed = parseTpexDailyQuotes(
    {
      aaData: [
        ['3293', '鈊象', '800', '+5', '795', '805', '790', '1000', '800000', '500'],
        ['00679B', '元大美債20年', '30.5', '+0.1', '30.4', '30.6', '30.3', '5000', '152500', '300'],
        ['00411A', '主動ETF', '15.2', '+0.2', '15.0', '15.3', '15.0', '2000', '30400', '120'],
        ['712345', '某上櫃權證', '1.25', '+0.05', '1.2', '1.3', '1.2', '500', '625', '10'],
        ['730001', '某上櫃認售權證', '0.85', '-0.02', '0.87', '0.88', '0.84', '300', '255', '8'],
        ['712345P', '某7碼上櫃認售權證', '0.55', '-0.01', '0.56', '0.57', '0.54', '100', '55', '2'],
      ],
    },
    '2026-11-24'
  );
  assert.ok(parsed['3293'], '合法上櫃個股 3293 應保留');
  assert.ok(parsed['00679B'], '合法債券 ETF 00679B 應保留');
  assert.ok(parsed['00411A'], '合法主動 ETF 00411A 應保留');
  assert.strictEqual(parsed['712345'], undefined, '6 碼上櫃權證 712345 應被濾除');
  assert.strictEqual(parsed['730001'], undefined, '6 碼上櫃權證 730001 應被濾除');
  assert.strictEqual(parsed['712345P'], undefined, '7 碼上櫃認售權證 712345P 應被濾除');

  const { dir, dbPath } = createTempDbPath('t09');
  try {
    initSqliteLakehouseDb(dbPath);
    const res = saveTwQuotesToSqlite(
      {
        '3293': { symbol: '3293', date: '2026-11-24', close: 800, open: 795, high: 805, low: 790, volume: 1000 },
        '00679B': { symbol: '00679B', date: '2026-11-24', close: 30.5, open: 30.4, high: 30.6, low: 30.3, volume: 5000 },
        '712345': { symbol: '712345', date: '2026-11-24', close: 1.25, open: 1.2, high: 1.3, low: 1.2, volume: 500 },
      },
      dbPath
    );
    assert.strictEqual(res.savedCount, 2, 'saveTwQuotesToSqlite 應濾除權證僅寫入 2 筆合法標的');
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T03 / T04 / T05: 持久化單一排程帳本與 NAS 排程器跨重啟續存契約
// ---------------------------------------------------------------------------
t('T03: 協調中樞帳本應持久化至 SQLite 並依 customDbPath 隔離、跨日自動歸零配額', () => {
  assert.strictEqual(typeof getLaneStateSnapshot, 'function', '協調中樞應匯出 getLaneStateSnapshot');
  assert.strictEqual(typeof updateLaneExecutionState, 'function', '協調中樞應匯出 updateLaneExecutionState');

  const { dir, dbPath } = createTempDbPath('t03');
  try {
    initSqliteLakehouseDb(dbPath);
    const t1 = Date.parse('2026-11-25T09:00:00Z');
    recordLaneAttempt('usDaily', '2026-11-25', t1, { customDbPath: dbPath });
    updateLaneExecutionState(
      'usDaily',
      { watermarkDate: '2026-11-24', lastRunIsoDate: '2026-11-25', status: 'ok', lastError: null },
      dbPath
    );

    // 清空記憶體並重新連線模擬行程重啟
    resetCoordinatorStateForTest({ clearMemoryOnly: true });
    closeSqliteDb();
    initSqliteLakehouseDb(dbPath);

    const budgetSameDay = checkLaneRetryBudget('usDaily', '2026-11-25', t1 + 60 * 1000, {
      customDbPath: dbPath,
      retryCooldownMs: 10 * 60 * 1000,
    });
    assert.strictEqual(budgetSameDay.allowed, false, '重啟後冷卻期內仍應被擋下');
    assert.strictEqual(budgetSameDay.inCooldown, true);
    assert.strictEqual(budgetSameDay.retryCount, 1);

    const snap = getLaneStateSnapshot('2026-11-25', dbPath);
    assert.strictEqual(snap.usDaily.watermarkDate, '2026-11-24');
    assert.strictEqual(snap.usDaily.retryCount, 1);
    assert.strictEqual(snap.usDaily.status, 'ok');

    // 跨日應保留 watermarkDate，但當日 retryCount 歸零
    const snapNextDay = getLaneStateSnapshot('2026-11-26', dbPath);
    assert.strictEqual(snapNextDay.usDaily.watermarkDate, '2026-11-24');
    assert.strictEqual(snapNextDay.usDaily.retryCount, 0);
  } finally {
    cleanupTempDir(dir);
  }
});

t('T04/T05: NAS 自治排程器重啟後應續存水位線與失敗配額，避免 OOM 重啟暴衝迴圈', async () => {
  const { dir, dbPath } = createTempDbPath('t05');
  try {
    initSqliteLakehouseDb(dbPath);
    const fixedNow = new Date('2026-11-25T09:00:00Z'); // 台北 17:00 (Phase 2)
    let usCalls = 0;

    const makeScheduler = () =>
      startNasAutonomousScheduler({
        customDbPath: dbPath,
        runOnStart: false,
        nowFn: () => fixedNow,
        handlers: {
          checkMarketFreshness: () => ({
            tw: { latestDate: '2026-11-25', anchorDate: '2026-11-25', isStale: false },
            us: { latestDate: '2026-11-23', anchorDate: '2026-11-24', isStale: true },
            tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-20', isStale: false },
            revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
          }),
          runUsDailySync: async () => {
            usCalls++;
            return { ok: false, error: 'SIMULATED_NET_FAIL', successCount: 0, failCount: 10, totalTargets: 10 };
          },
          runMacroSync: async () => ({ ok: true }),
        },
      });

    // 模擬第一輪實例失敗 4 次耗盡配額
    const sched1 = makeScheduler();
    for (let i = 0; i < 4; i++) {
      await sched1.runTickNow();
    }
    assert.strictEqual(usCalls, 4, '第一輪實例最多僅應嘗試 4 次');
    sched1.stop();

    // 模擬容器 OOM 重啟：清空記憶體快取 + 建立全新排程器實例
    resetCoordinatorStateForTest({ clearMemoryOnly: true });
    closeSqliteDb();
    initSqliteLakehouseDb(dbPath);

    const sched2 = makeScheduler();
    const resAfterRestart = await sched2.runTickNow();
    assert.strictEqual(usCalls, 4, '容器重啟後配額已耗盡，絕不可再觸發第 5 次暴衝重試');
    assert.strictEqual(resAfterRestart.triggered, false);
    assert.strictEqual(sched2.getState().lanes.usDaily.retryCount, 4);
    sched2.stop();

    // 確認 evaluateScheduleWindow 仍維持既有純函式行為
    const win = evaluateScheduleWindow(
      fixedNow,
      {
        tw: { latestDate: '2026-11-25', anchorDate: '2026-11-25', isStale: false },
        us: { latestDate: '2026-11-24', anchorDate: '2026-11-24', isStale: false },
        tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-20', isStale: false },
        revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
      },
      {}
    );
    assert.strictEqual(win.reason, 'UP_TO_DATE');
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T07: 每週湖倉同步子任務零筆寫入契約與滾動備份閘門
// ---------------------------------------------------------------------------
t('T07: Weekly 子任務回傳 savedCount=0 且無快取標記應判定失敗並阻斷水位線與備份；帶 cached=true 則合法放行', async () => {
  const { dir, dbPath } = createTempDbPath('t07');
  try {
    initSqliteLakehouseDb(dbPath);
    const satNow = new Date('2026-11-28T03:00:00Z'); // 台北週六 11:00

    // 1. tdcc 內部吞錯回傳 { savedCount: 0 }（無 cached/skipped/upToDate）
    const badReport = await runWeeklyLakehouseSync({
      customDbPath: dbPath,
      now: satNow,
      handlers: {
        runTdccIngestion: async () => ({ savedCount: 0 }),
        runCorporateActionsIngestion: async () => 25,
        runMonthlyRevenueIngestion: async () => ({ savedCount: 1800 }),
        fetchAndIngestEtfDailyNav: async () => ({ success: true, count: 350 }),
        fetchAndIngestTwseEtfOpenApiMeta: async () => ({ success: true, savedCount: 350 }),
      },
    });
    assert.strictEqual(badReport.tdcc.ok, false, 'tdcc 回傳 0 筆且無快取標記應判定 ok=false');
    assert.strictEqual(badReport.ok, false, '任一子任務失敗時整份週報應為 ok=false');

    // 2. 排程器應阻斷水位線與備份
    let backupCalled = 0;
    const sched = startNasAutonomousScheduler({
      customDbPath: dbPath,
      runOnStart: false,
      nowFn: () => satNow,
      handlers: {
        checkMarketFreshness: () => ({
          tw: { latestDate: '2026-11-27', anchorDate: '2026-11-27', isStale: false },
          us: { latestDate: '2026-11-27', anchorDate: '2026-11-27', isStale: false },
          tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-27', isStale: true },
          revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
        }),
        runWeeklyLakehouseSync: async () => badReport,
        createRollingBackup: () => {
          backupCalled++;
          return { ok: true, fileName: 'bad.db', path: 'bad.db', sizeBytes: 100, pruned: [] };
        },
      },
    });
    const tick1 = await sched.runTickNow();
    assert.strictEqual(tick1.tasks.weekly.ok, false);
    assert.strictEqual(backupCalled, 0, '週報失敗時絕不可觸發滾動備份');
    assert.strictEqual(sched.getState().lanes.weekly.watermarkDate, null, '週報失敗不可推進水位線');
    sched.stop();

    // 3. 顯式標記 cached: true 時，savedCount=0 應合法放行
    const cachedReport = await runWeeklyLakehouseSync({
      customDbPath: dbPath,
      now: satNow,
      handlers: {
        runTdccIngestion: async () => ({ savedCount: 0, cached: true }),
        runCorporateActionsIngestion: async () => ({ savedCount: 0, upToDate: true }),
        runMonthlyRevenueIngestion: async () => ({ savedCount: 0, skipped: true }),
        fetchAndIngestEtfDailyNav: async () => ({ success: true, count: 0, cached: true }),
        fetchAndIngestTwseEtfOpenApiMeta: async () => ({ success: true, savedCount: 0, cached: true }),
      },
    });
    assert.strictEqual(cachedReport.ok, true, '顯式標記 cached/skipped/upToDate 之 0 筆應合法放行');
  } finally {
    cleanupTempDir(dir);
  }
});

// ---------------------------------------------------------------------------
// T08: 美股每日同步最低有效完成率門檻守衛 (80% Coverage Gate)
// ---------------------------------------------------------------------------
t('T08: 美股有效完成率低於 80% 應判定失敗不推進水位線，達 80% 以上（含 skipped）始合法推進', async () => {
  assert.strictEqual(
    MARKET_HEALTH_THRESHOLDS.US_DAILY_MIN_SUCCESS_RATIO,
    0.8,
    'sync-thresholds 應定義 US_DAILY_MIN_SUCCESS_RATIO = 0.8'
  );

  const { dir, dbPath } = createTempDbPath('t08');
  try {
    initSqliteLakehouseDb(dbPath);
    const now = new Date('2026-11-25T09:00:00Z');

    // 1. 10 檔僅成功 1 檔 (10% < 80%) 即使回傳 ok: true 仍應被排程器攔截
    const schedFail = startNasAutonomousScheduler({
      customDbPath: dbPath,
      runOnStart: false,
      nowFn: () => now,
      handlers: {
        checkMarketFreshness: () => ({
          tw: { latestDate: '2026-11-25', anchorDate: '2026-11-25', isStale: false },
          us: { latestDate: '2026-11-23', anchorDate: '2026-11-24', isStale: true },
          tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-20', isStale: false },
          revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
        }),
        runUsDailySync: async () => ({
          ok: true,
          date: '2026-11-24',
          successCount: 1,
          failCount: 9,
          skippedCount: 0,
          totalTargets: 10,
        }),
        runMacroSync: async () => ({ ok: true }),
      },
    });
    const r1 = await schedFail.runTickNow();
    assert.strictEqual(r1.tasks.usDaily.ok, false, '10 檔僅成功 1 檔 (10%) 應判定失敗');
    assert.strictEqual(schedFail.getState().lanes.usDaily.watermarkDate, null, '低覆蓋率絕不可推進美股水位線');
    schedFail.stop();

    // 2. 10 檔成功 3 + 略過 5 = 80% 應合法推進水位線
    const schedPass = startNasAutonomousScheduler({
      customDbPath: dbPath,
      runOnStart: false,
      nowFn: () => now,
      handlers: {
        checkMarketFreshness: () => ({
          tw: { latestDate: '2026-11-25', anchorDate: '2026-11-25', isStale: false },
          us: { latestDate: '2026-11-23', anchorDate: '2026-11-24', isStale: true },
          tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-20', isStale: false },
          revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
        }),
        runUsDailySync: async () => ({
          ok: true,
          date: '2026-11-24',
          successCount: 3,
          failCount: 2,
          skippedCount: 5,
          totalTargets: 10,
        }),
        runMacroSync: async () => ({ ok: true }),
      },
    });
    const r2 = await schedPass.runTickNow();
    assert.strictEqual(r2.tasks.usDaily.ok, true, '有效完成率 80% 應判定成功');
    assert.strictEqual(schedPass.getState().lanes.usDaily.watermarkDate, '2026-11-24');
    schedPass.stop();
  } finally {
    cleanupTempDir(dir);
  }
});

(async () => {
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err?.stack || err}`);
      failed++;
    }
  }
  console.log(`\n[Spec 0248 Wave 1 Tests] Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
})();
