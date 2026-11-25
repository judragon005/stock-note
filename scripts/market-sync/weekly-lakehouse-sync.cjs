/**
 * weekly-lakehouse-sync.cjs
 * 台股每週全市場數據湖倉統一同步協調器 (Spec 0242)
 * 單一入口一次完成：
 * 1. TDCC 全市場最新一週集保股權分散快照累加 (2,337+ 檔，不覆蓋歷史週次)
 * 2. 當年度台股上市 (TWSE TWT49U) + 上櫃 (TPEx exDailyQ) 除權息實績 + 預告表 (TWT48U)
 * 3. 台股 ETF 每日淨值、發行單位與官方基本資料 (etf_daily_nav + etf_meta)
 * 4. 公開資訊觀測站 (MOPS) 最新全市場月營收
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { getMarketAnchorDate } = require('./market-freshness-service.cjs');
const { runTdccIngestion } = require('./ingest-tw-tdcc.cjs');
const { runCorporateActionsIngestion } = require('./ingest-tw-corporate-actions.cjs');
const { runMonthlyRevenueIngestion } = require('./ingest-tw-monthly-revenue.cjs');
const { fetchAndIngestEtfDailyNav } = require('./ingest-macro-sentiment.cjs');
const { fetchAndIngestTwseEtfOpenApiMeta } = require('./ingest-tw-etf-meta.cjs');

/**
 * 統一判讀每週子任務執行結果 (Spec 0248 T07)
 * - 顯式失敗 (ok===false / success===false / error 非空) 一律判失敗
 * - savedCount===0 且未顯式標記 cached/skipped/upToDate 時視為靜默失敗，阻斷水位線與備份
 */
function normalizeWeeklySubtaskResult(rawRes, { countKeys = ['savedCount', 'count'], defaultError = 'SUBTASK_FAILED' } = {}) {
  if (typeof rawRes === 'number') {
    const count = Number.isFinite(rawRes) ? rawRes : 0;
    const ok = Number.isFinite(rawRes) && count > 0;
    return {
      ok,
      savedCount: count,
      error: ok ? null : 'EMPTY_RESULT_WITHOUT_CACHE_FLAG',
    };
  }
  if (!rawRes || typeof rawRes !== 'object') {
    return { ok: false, savedCount: 0, error: defaultError };
  }
  let count = 0;
  for (const key of countKeys) {
    if (rawRes[key] !== undefined && rawRes[key] !== null) {
      const n = Number(rawRes[key]);
      if (Number.isFinite(n)) {
        count = n;
        break;
      }
    }
  }
  const hasExplicitFailure =
    rawRes.ok === false ||
    rawRes.success === false ||
    (typeof rawRes.error === 'string' && rawRes.error.trim().length > 0);
  const isExplicitlyCached = Boolean(rawRes.cached || rawRes.skipped || rawRes.upToDate);

  if (hasExplicitFailure) {
    return { ok: false, savedCount: count, error: rawRes.error || defaultError };
  }
  if (count <= 0 && !isExplicitlyCached) {
    return { ok: false, savedCount: 0, error: 'EMPTY_RESULT_WITHOUT_CACHE_FLAG' };
  }
  return { ok: true, savedCount: count, error: null };
}

/**
 * 執行每週全市場湖倉增量累積更新 (冪等、單點錯誤隔離)
 */
async function runWeeklyLakehouseSync({ customDbPath, now = new Date(), handlers = {} } = {}) {
  const startedAt = Date.now();
  const twAnchorDate = getMarketAnchorDate('TW', now);
  const report = {
    ok: false,
    startedAt: new Date(startedAt).toISOString(),
    anchorDate: twAnchorDate,
    tdcc: { ok: false, savedCount: 0, error: null },
    corporateActions: { ok: false, savedCount: 0, error: null },
    monthlyRevenue: { ok: false, savedCount: 0, error: null },
    etfNav: { ok: false, savedCount: 0, error: null },
    etfMeta: { ok: false, savedCount: 0, error: null },
  };

  const tdccFn = handlers.runTdccIngestion || runTdccIngestion;
  const corpFn = handlers.runCorporateActionsIngestion || runCorporateActionsIngestion;
  const revFn = handlers.runMonthlyRevenueIngestion || runMonthlyRevenueIngestion;
  const navFn = handlers.fetchAndIngestEtfDailyNav || fetchAndIngestEtfDailyNav;
  const metaFn =
    handlers.fetchAndIngestTwseEtfOpenApiMeta ||
    handlers.ingestTwseEtfMetaList ||
    fetchAndIngestTwseEtfOpenApiMeta;

  try {
    const res = await tdccFn(customDbPath);
    report.tdcc = normalizeWeeklySubtaskResult(res, { defaultError: 'TDCC_FAILED' });
  } catch (err) {
    report.tdcc.error = err?.message || String(err);
  }

  try {
    const res = await corpFn(customDbPath, { includeCurrentYearHistory: true });
    report.corporateActions = normalizeWeeklySubtaskResult(res, { defaultError: 'CORPORATE_ACTIONS_FAILED' });
  } catch (err) {
    report.corporateActions.error = err?.message || String(err);
  }

  try {
    const res = await revFn(customDbPath);
    report.monthlyRevenue = normalizeWeeklySubtaskResult(res, { defaultError: 'MONTHLY_REVENUE_FAILED' });
  } catch (err) {
    report.monthlyRevenue.error = err?.message || String(err);
  }

  try {
    const navRes = await navFn(customDbPath, twAnchorDate);
    const parsedNav = normalizeWeeklySubtaskResult(navRes, {
      countKeys: ['count', 'savedCount'],
      defaultError: 'ETF_NAV_FAILED',
    });
    report.etfNav = {
      ...parsedNav,
      anchorDate: twAnchorDate,
    };
  } catch (err) {
    report.etfNav.error = err?.message || String(err);
  }

  try {
    const db = initSqliteLakehouseDb(customDbPath);
    const res = await metaFn(db);
    report.etfMeta = normalizeWeeklySubtaskResult(res, {
      countKeys: ['savedCount', 'count'],
      defaultError: 'ETF_META_FAILED',
    });
  } catch (err) {
    report.etfMeta.error = err?.message || String(err);
  }

  report.ok = Boolean(
    report.tdcc.ok &&
    report.corporateActions.ok &&
    report.monthlyRevenue.ok &&
    report.etfNav.ok &&
    report.etfMeta.ok
  );
  report.durationMs = Date.now() - startedAt;
  return report;
}

if (require.main === module) {
  console.log('🏛️ [WeeklySync] 啟動台股全市場每週數據湖倉同步 (Spec 0242)...');
  runWeeklyLakehouseSync()
    .then((report) => {
      console.log('✔ [WeeklySync] 完成摘要:', JSON.stringify(report, null, 2));
    })
    .catch((err) => {
      console.error('❌ [WeeklySync] 執行失敗:', err);
      process.exit(1);
    });
}

module.exports = {
  runWeeklyLakehouseSync,
};
