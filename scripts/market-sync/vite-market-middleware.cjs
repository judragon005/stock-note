/**
 * vite-market-middleware.cjs
 * Vite 原生 Connect 中介層 API
 * 提供零連接埠、零跨域的本機 SQLite REST API
 */

const url = require('url');
const { getSqliteDbConnection, initSqliteLakehouseDb, isSqliteSupported } = require('./sqlite-db-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');
const { getMarketAnchorDate, checkMarketFreshness } = require('./market-freshness-service.cjs');

const DEFAULT_CATCHUP_COOLDOWN_MS = 10 * 60 * 1000; // 預設 10 分鐘冷卻保護防線 (Spec 0165)
const CATCHUP_COOLDOWN_MS = Number(process.env.MARKET_CATCHUP_COOLDOWN_MS) || DEFAULT_CATCHUP_COOLDOWN_MS;
let isCatchingUp = false;
let lastCatchupTime = 0;

/**
 * 判定是否仍在回補冷卻時間內
 */
function isCatchupInCooldown(lastTime, now = Date.now(), cooldownMs = CATCHUP_COOLDOWN_MS) {
  if (!lastTime || lastTime <= 0) return false;
  return now - lastTime < cooldownMs;
}

/**
 * 啟動非同步追趕任務 (具備冷卻門檻防禦)
 */
function triggerCatchupTask(customDbPath, options = {}) {
  const { bypassTestEnv = false, force = false } = options;
  if (!bypassTestEnv && (process.env.NODE_ENV === 'test' || process.env.VITEST)) {
    return false;
  }
  if (isCatchingUp) return false;

  const now = Date.now();
  if (!force && isCatchupInCooldown(lastCatchupTime, now)) {
    if (process.env.DEBUG_MARKET_CATCHUP === 'true') {
      const elapsedSec = Math.round((now - lastCatchupTime) / 1000);
      const cooldownSec = Math.round(CATCHUP_COOLDOWN_MS / 1000);
      const remainingSec = Math.max(0, cooldownSec - elapsedSec);
      console.log(`[MarketCatchup] 距離上次同步未滿冷卻時間 (${elapsedSec}s / ${cooldownSec}s，尚餘 ${remainingSec} 秒)，防禦性略過回補。`);
    }
    return false;
  }

  isCatchingUp = true;
  lastCatchupTime = now;

  setImmediate(async () => {
    try {
      console.log(`[MarketCatchup] 偵測到本機資料庫過期，啟動背景聯網追趕同步 (Spec 0170 & Spec 0177)...`);
      const { runTwMarketSync } = require('./sync-tw-market.cjs');
      await runTwMarketSync();

      try {
        const { runTdccIngestion } = require('./ingest-tw-tdcc.cjs');
        await runTdccIngestion(customDbPath);
      } catch (tdccErr) {
        console.warn(`[MarketCatchup] TDCC 入庫警示:`, tdccErr.message);
      }

      try {
        const { runMonthlyRevenueIngestion } = require('./ingest-tw-monthly-revenue.cjs');
        await runMonthlyRevenueIngestion(customDbPath);
      } catch (revErr) {
        console.warn(`[MarketCatchup] 月營收入庫警示:`, revErr.message);
      }

      console.log(`[MarketCatchup] ✔ 背景聯網追趕同步完成 (含 TDCC 與月營收)！`);
    } catch (err) {
      console.warn(`[MarketCatchup] 背景追趕回補警告:`, err.message);
    } finally {
      isCatchingUp = false;
    }
  });
  return true;
}

function resetCatchupStateForTest() {
  isCatchingUp = false;
  lastCatchupTime = 0;
}

function setLastCatchupTimeForTest(time) {
  lastCatchupTime = time;
}

/**
 * 建立 Vite Connect 中介層
 * @param {string} [customDbPath]
 */
function createMarketApiMiddleware(customDbPath) {
  // 中介層啟動時非同步巡檢資料庫陳舊度 (委託 market-freshness-service.cjs)
  if (isSqliteSupported()) {
    try {
      const db = initSqliteLakehouseDb(customDbPath);
      const freshness = checkMarketFreshness(db);
      if (freshness.tw.isStale || freshness.us.isStale || freshness.tdcc?.isStale || freshness.revenue?.isStale) {
        triggerCatchupTask(customDbPath);
      }
    } catch (e) {
      // 靜默容錯
    }
  }

  return function marketApiMiddleware(req, res, next) {
    if (!req.url || !req.url.startsWith('/api/market/')) {
      return next();
    }

    if (!isSqliteSupported()) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          error: 'SQLITE_UNSUPPORTED',
          message: '當前 Node.js 執行階段不支援 node:sqlite，請使用 Node.js 22+。',
        })
      );
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query || {};

    const db = initSqliteLakehouseDb(customDbPath);

    // 0. GET /api/market/sync-status (Spec 0160 & Spec 0161 委託領域服務)
    if (pathname === '/api/market/sync-status') {
      const freshness = checkMarketFreshness(db);

      if (query.catchup === 'true' && (freshness.tw.isStale || freshness.us.isStale || freshness.tdcc?.isStale || freshness.revenue?.isStale)) {
        triggerCatchupTask(customDbPath);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          tw: freshness.tw,
          us: freshness.us,
          tdcc: freshness.tdcc,
          revenue: freshness.revenue,
          isCatchingUp,
          lastCatchupTime,
          timestamp: Date.now(),
        })
      );
    }

    // 0.1 GET /api/market/backfill-status (Spec 0168 / Ticket 08)
    if (pathname === '/api/market/backfill-status') {
      const { getBackfillGlobalStatus } = require('./backfill-full-market-history.cjs');
      const status = getBackfillGlobalStatus();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(status));
    }

    // 0.2 POST /api/market/backfill-all (Spec 0168 / Ticket 08)
    if (pathname === '/api/market/backfill-all') {
      const { triggerBackfillTask, getBackfillGlobalStatus } = require('./backfill-full-market-history.cjs');
      const targetMarket = (query.market || 'ALL').toUpperCase();
      const targetDays = query.days === 'auto' || !query.days ? 'auto' : (parseInt(query.days, 10) || 250);
      const resData = triggerBackfillTask({
        market: targetMarket,
        days: targetDays,
        dbPath: customDbPath,
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          success: resData.started,
          message: resData.message,
          status: getBackfillGlobalStatus(),
        })
      );
    }

    // 0.3 POST /api/market/backfill-cancel (Spec 0187 / Ticket 03)
    if (pathname === '/api/market/backfill-cancel') {
      const { cancelBackfillTask, getBackfillGlobalStatus } = require('./backfill-full-market-history.cjs');
      const cancelRes = cancelBackfillTask();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          success: cancelRes.cancelled,
          message: cancelRes.message,
          status: getBackfillGlobalStatus(),
        })
      );
    }

    // 0.4 POST /api/market/backfill-reset (Spec 0187 / Ticket 03)
    if (pathname === '/api/market/backfill-reset') {
      const { resetBackfillGlobalStatus, getBackfillGlobalStatus } = require('./backfill-full-market-history.cjs');
      const resetRes = resetBackfillGlobalStatus();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          success: resetRes.reset,
          message: resetRes.message,
          status: getBackfillGlobalStatus(),
        })
      );
    }


    // 1. GET /api/market/symbols?q=...
    if (pathname === '/api/market/symbols') {
      const q = String(query.q || '').trim();
      const limit = parseInt(query.limit, 10) || 20;
      const results = searchSymbolsMeta(q, limit, customDbPath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(results));
    }

    // 2. GET /api/market/quote/:symbol
    const quoteMatch = pathname.match(/^\/api\/market\/quote\/([A-Za-z0-9\-_]+)$/);
    if (quoteMatch) {
      const symbol = quoteMatch[1].toUpperCase();
      const meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get(symbol);
      const latestCandle = db
        .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1')
        .get(symbol);

      if (!latestCandle && !meta) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'SYMBOL_NOT_FOUND', symbol }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          symbol,
          meta: meta || null,
          quote: latestCandle || null,
        })
      );
    }

    // 2.1 GET /api/market/corporate-actions/:symbol (Spec 0188 / Ticket 05)
    const caMatch = pathname.match(/^\/api\/market\/corporate-actions\/([A-Za-z0-9\-_]+)$/);
    if (caMatch) {
      const symbol = caMatch[1].toUpperCase();
      const aliasSym = symbol.endsWith('O') ? symbol.slice(0, -1) : `${symbol}O`;
      try {
        const rows = db
          .prepare(
            'SELECT * FROM corporate_action_calendar WHERE symbol IN (?, ?) ORDER BY ex_date ASC'
          )
          .all(symbol, aliasSym);

        if (rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ symbol, actions: [] }));
        }

        const mapByYear = new Map();
        for (const r of rows) {
          const exDate = r.ex_date || '';
          const year = exDate ? new Date(exDate).getFullYear() : 0;
          if (!year) continue;

          const cash = Number(r.cash_dividend_per_share || 0);
          const stock = Number(r.stock_dividend_ratio || 0);

          if (mapByYear.has(year)) {
            const item = mapByYear.get(year);
            item.cashDividend = Number((item.cashDividend + cash).toFixed(2));
            item.stockDividend = Number((item.stockDividend + stock).toFixed(2));
            item.totalDividend = Number((item.cashDividend + item.stockDividend).toFixed(2));
          } else {
            mapByYear.set(year, {
              year,
              cashDividend: cash,
              stockDividend: stock,
              totalDividend: Number((cash + stock).toFixed(2)),
              exDividendDate: r.ex_date || undefined,
              payDate: r.payment_date || undefined,
            });
          }
        }

        const actions = Array.from(mapByYear.values()).sort((a, b) => a.year - b.year);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ symbol, actions }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: err.message, actions: [] }));
      }
    }

    // 3. GET /api/market/history/:symbol?limit=250
    const historyMatch = pathname.match(/^\/api\/market\/history\/([A-Za-z0-9\-_]+)$/);
    if (historyMatch) {
      const symbol = historyMatch[1].toUpperCase();
      const isAll = String(query.limit || '').trim().toLowerCase() === 'all';
      const limit = isAll ? 0 : (parseInt(query.limit, 10) || 250);

      const aliasSym = symbol.endsWith('O') ? symbol.slice(0, -1) : `${symbol}O`;
      let meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol IN (?, ?)').get(symbol, aliasSym);

      // 雙向別名日 K 查詢與防斷層合併 (Spec 0170 & Spec 0188: 支援全量與動態天數)
      const sqlLimit = isAll || limit <= 0 ? -1 : limit * 2;
      const rawCandleRows = db
        .prepare('SELECT * FROM daily_candles WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT ?')
        .all(symbol, aliasSym, sqlLimit);

      const dateMap = new Map();
      for (const row of rawCandleRows) {
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, { ...row, symbol });
        }
      }
      let candles = Array.from(dateMap.values());
      if (!isAll && limit > 0 && candles.length > limit) {
        candles = candles.slice(0, limit);
      }

      // 轉為由舊至新
      candles.reverse();

      const dates = candles.map((c) => c.date);
      const chipsMap = {};

      if (dates.length > 0) {
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const chipsRows = db
          .prepare(
            'SELECT * FROM tw_institutional_chips WHERE symbol IN (?, ?) AND date >= ? AND date <= ? ORDER BY date ASC'
          )
          .all(symbol, aliasSym, minDate, maxDate);

        for (const row of chipsRows) {
          chipsMap[row.date] = { ...row, symbol };
        }
      }

      // 新增查詢 TDCC 集保股權分散表 (最近 10 筆週別資料，支援雙向別名防斷層)
      let tdccRows = [];
      try {
        tdccRows = db
          .prepare('SELECT * FROM tw_tdcc_distribution WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 10')
          .all(symbol, aliasSym);
        tdccRows.reverse();
      } catch {}

      // 新增查詢月營收 (最近 12 個月，支援雙向別名防斷層)
      let revenueRows = [];
      try {
        revenueRows = db
          .prepare('SELECT * FROM tw_monthly_revenue WHERE symbol IN (?, ?) ORDER BY year_month DESC LIMIT 12')
          .all(symbol, aliasSym);
        revenueRows.reverse();
      } catch {}

      // 新增查詢官方每日估值與自身歷史倍數數列 (PE/PB/Yield，Spec 0197 & Spec 0199)
      let valRow = null;
      let valHistory = [];
      try {
        valRow = db
          .prepare('SELECT pe, pb, dividend_yield FROM tw_valuation_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
          .get(symbol, aliasSym) || null;

        valHistory = db
          .prepare('SELECT pe, pb, dividend_yield, date FROM tw_valuation_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 250')
          .all(symbol, aliasSym) || [];
      } catch {}

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          symbol,
          meta: meta || null,
          candles,
          chips: chipsMap,
          tdcc: tdccRows,
          revenue: revenueRows,
          valuation: valRow ? { ...valRow, history: valHistory } : null,
        })
      );
    }

    // 若未匹配任何端點
    return next();
  };
}

module.exports = {
  createMarketApiMiddleware,
  DEFAULT_CATCHUP_COOLDOWN_MS,
  CATCHUP_COOLDOWN_MS,
  isCatchupInCooldown,
  triggerCatchupTask,
  resetCatchupStateForTest,
  setLastCatchupTimeForTest,
};
