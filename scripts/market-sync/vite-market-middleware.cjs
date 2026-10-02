/**
 * vite-market-middleware.cjs
 * Vite 原生 Connect 中介層 API
 * 提供零連接埠、零跨域的本機 SQLite REST API
 */

const url = require('url');
const { getSqliteDbConnection, initSqliteLakehouseDb, isSqliteSupported } = require('./sqlite-db-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');
const { getMarketAnchorDate, checkMarketFreshness } = require('./market-freshness-service.cjs');

let isCatchingUp = false;
let lastCatchupTime = 0;

/**
 * 啟動非同步追趕任務
 */
function triggerCatchupTask(customDbPath) {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return;
  }
  if (isCatchingUp) return;
  isCatchingUp = true;
  lastCatchupTime = Date.now();

  setImmediate(async () => {
    try {
      console.log(`[MarketCatchup] 偵測到本機資料庫過期，啟動背景追趕回補...`);
      const { runFullMarketHistoryBackfill } = require('./backfill-local-csv.cjs');
      await runFullMarketHistoryBackfill();
      console.log(`[MarketCatchup] ✔ 背景追趕同步完成！`);
    } catch (err) {
      console.warn(`[MarketCatchup] 背景追趕回補警告:`, err.message);
    } finally {
      isCatchingUp = false;
    }
  });
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
      if (freshness.tw.isStale || freshness.us.isStale) {
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

      if (query.catchup === 'true' && (freshness.tw.isStale || freshness.us.isStale)) {
        triggerCatchupTask(customDbPath);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          tw: freshness.tw,
          us: freshness.us,
          isCatchingUp,
          lastCatchupTime,
          timestamp: Date.now(),
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

    // 3. GET /api/market/history/:symbol?limit=250
    const historyMatch = pathname.match(/^\/api\/market\/history\/([A-Za-z0-9\-_]+)$/);
    if (historyMatch) {
      const symbol = historyMatch[1].toUpperCase();
      const limit = parseInt(query.limit, 10) || 250;

      const meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get(symbol);
      const candles = db
        .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT ?')
        .all(symbol, limit);

      // 轉為由舊至新
      candles.reverse();

      const dates = candles.map((c) => c.date);
      const chipsMap = {};

      if (dates.length > 0) {
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const chipsRows = db
          .prepare(
            'SELECT * FROM tw_institutional_chips WHERE symbol = ? AND date >= ? AND date <= ? ORDER BY date ASC'
          )
          .all(symbol, minDate, maxDate);

        for (const row of chipsRows) {
          chipsMap[row.date] = row;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          symbol,
          meta: meta || null,
          candles,
          chips: chipsMap,
        })
      );
    }

    // 若未匹配任何端點
    return next();
  };
}

module.exports = {
  createMarketApiMiddleware,
};
