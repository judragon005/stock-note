/**
 * backfill-portfolio-series.cjs
 * 持股清冊一鍵批次歷史序列補齊腳本 (Spec 0239 T05)
 * 針對指定台股/美股持股清單受控節流補齊：
 * - 台股：TDCC 10 週歷史、月營收 12 個月、近 5 年歷史配息
 * - 美股：us_fundamentals_daily (Yahoo quoteSummary Crumb) 與美股歷史配息
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { backfillSymbolTdccHistory } = require('./ingest-tw-tdcc.cjs');
const { backfillSymbolMonthlyRevenue } = require('./ingest-tw-monthly-revenue.cjs');
const { getOrFetchUsFundamentals } = require('./us-fundamentals-ingestion.cjs');
const { backfillSymbolDividendsFromRemote } = require('./vite-market-middleware.cjs');

const DEFAULT_PORTFOLIO_SYMBOLS = [
  '00403A', '0050', '00636', '00878', '00919', '00923', '00924',
  '009816', '00981A', '009826', '2327', '2330', '2481', '2755',
  '2883', '2886', '2890', '3715', '8105', '9927', 'VT',
];

function isTwSymbol(symbol) {
  return /^\d{4,6}[A-Z]?$/i.test(String(symbol || '').trim());
}

function isTwEtfSymbol(symbol) {
  return /^(00\d{2,4}[A-Z]?|01\d{3}[A-Z]?)$/i.test(String(symbol || '').trim());
}

/**
 * 批次補齊指定標的清單之歷史序列
 */
async function backfillPortfolioSeries(symbols = DEFAULT_PORTFOLIO_SYMBOLS, options = {}) {
  const {
    dbPath,
    throttleMs = 600,
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
    handlers = {},
  } = options;

  const db = initSqliteLakehouseDb(dbPath);
  const runTdcc = handlers.backfillSymbolTdccHistory || backfillSymbolTdccHistory;
  const runRev = handlers.backfillSymbolMonthlyRevenue || backfillSymbolMonthlyRevenue;
  const runDiv = handlers.backfillSymbolDividendsFromRemote || backfillSymbolDividendsFromRemote;
  const runUsFund = handlers.getOrFetchUsFundamentals || getOrFetchUsFundamentals;

  const summary = {
    processed: 0,
    twSucceeded: 0,
    usSucceeded: 0,
    errors: [],
  };

  for (let i = 0; i < symbols.length; i++) {
    const raw = String(symbols[i] || '').trim().toUpperCase();
    if (!raw) continue;
    summary.processed++;

    try {
      if (isTwSymbol(raw)) {
        await runTdcc(raw, 10, dbPath);
        if (!isTwEtfSymbol(raw)) {
          await runRev(raw, 12, dbPath);
        }
        await runDiv(raw, dbPath);
        summary.twSucceeded++;
      } else {
        await runUsFund(db, raw, { includeDividends: true });
        summary.usSucceeded++;
      }
    } catch (err) {
      summary.errors.push({ symbol: raw, error: err?.message || String(err) });
    }

    if (i < symbols.length - 1 && throttleMs > 0) {
      await sleepFn(throttleMs);
    }
  }

  return summary;
}

if (require.main === module) {
  const cliSyms = process.argv.slice(2).filter((s) => !s.startsWith('--'));
  const target = cliSyms.length > 0 ? cliSyms : DEFAULT_PORTFOLIO_SYMBOLS;
  backfillPortfolioSeries(target)
    .then((res) => {
      console.log('[PortfolioSeriesBackfill] 完成:', JSON.stringify(res));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[PortfolioSeriesBackfill] 失敗:', err);
      process.exit(1);
    });
}

module.exports = {
  DEFAULT_PORTFOLIO_SYMBOLS,
  backfillPortfolioSeries,
};
