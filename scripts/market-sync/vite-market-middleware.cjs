/**
 * vite-market-middleware.cjs
 * Vite 原生 Connect 中介層 API
 * 提供零連接埠、零跨域的本機 SQLite REST API
 */

const url = require('url');
const { getSqliteDbConnection, initSqliteLakehouseDb, isSqliteSupported } = require('./sqlite-db-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');

/**
 * 建立 Vite Connect 中介層
 * @param {string} [customDbPath]
 */
function createMarketApiMiddleware(customDbPath) {
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
