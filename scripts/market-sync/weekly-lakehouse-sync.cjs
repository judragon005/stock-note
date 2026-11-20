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
const { runTdccIngestion } = require('./ingest-tw-tdcc.cjs');
const { runCorporateActionsIngestion } = require('./ingest-tw-corporate-actions.cjs');
const { runMonthlyRevenueIngestion } = require('./ingest-tw-monthly-revenue.cjs');
const { fetchAndIngestEtfDailyNav } = require('./ingest-macro-sentiment.cjs');
const { ingestTwseEtfMetaList } = require('./ingest-tw-etf-meta.cjs');

/**
 * 執行每週全市場湖倉增量累積更新 (冪等、單點錯誤隔離)
 */
async function runWeeklyLakehouseSync({ customDbPath, handlers = {} } = {}) {
  const startedAt = Date.now();
  const report = {
    startedAt: new Date(startedAt).toISOString(),
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
  const metaFn = handlers.ingestTwseEtfMetaList || ingestTwseEtfMetaList;

  try {
    const res = await tdccFn(customDbPath);
    report.tdcc = { ok: true, savedCount: Number(res?.savedCount || 0), error: null };
  } catch (err) {
    report.tdcc.error = err?.message || String(err);
  }

  try {
    const count = await corpFn(customDbPath, { includeCurrentYearHistory: true });
    report.corporateActions = { ok: true, savedCount: Number(count || 0), error: null };
  } catch (err) {
    report.corporateActions.error = err?.message || String(err);
  }

  try {
    const res = await revFn(customDbPath);
    report.monthlyRevenue = { ok: true, savedCount: Number(res?.savedCount || 0), error: null };
  } catch (err) {
    report.monthlyRevenue.error = err?.message || String(err);
  }

  try {
    const count = await navFn(customDbPath);
    report.etfNav = { ok: true, savedCount: Number(count || 0), error: null };
  } catch (err) {
    report.etfNav.error = err?.message || String(err);
  }

  try {
    const db = initSqliteLakehouseDb(customDbPath);
    const res = await metaFn(db);
    report.etfMeta = { ok: true, savedCount: Number(res?.savedCount ?? res ?? 0), error: null };
  } catch (err) {
    report.etfMeta.error = err?.message || String(err);
  }

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
