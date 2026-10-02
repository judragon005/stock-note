/**
 * vite-market-middleware.cjs
 * Vite 原生 Connect 中介層 API
 * 提供零連接埠、零跨域的本機 SQLite REST API
 */

const url = require('url');
const { getSqliteDbConnection, initSqliteLakehouseDb, isSqliteSupported } = require('./sqlite-db-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');

let isCatchingUp = false;
let lastCatchupTime = 0;

/**
 * 計算指定市場當前已結算之錨定交易日
 */
function getMarketAnchorDate(market = 'TW', now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const offsetHours = market === 'TW' ? 8 : -4;
  const local = new Date(utc + 3600000 * offsetHours);
  const day = local.getDay();
  const hours = local.getHours();
  const minutes = local.getMinutes();
  const totalMins = hours * 60 + minutes;

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const isWeekend = day === 0 || day === 6;
  if (market === 'TW') {
    if (!isWeekend && totalMins >= 15 * 60) {
      return formatDate(local);
    }
    const target = new Date(local);
    if (day === 0) target.setDate(target.getDate() - 2);
    else if (day === 6) target.setDate(target.getDate() - 1);
    else target.setDate(target.getDate() - 1);
    return formatDate(target);
  } else {
    if (!isWeekend && totalMins >= 17 * 60) {
      return formatDate(local);
    }
    const target = new Date(local);
    if (day === 0) target.setDate(target.getDate() - 2);
    else if (day === 6) target.setDate(target.getDate() - 1);
    else target.setDate(target.getDate() - 1);
    return formatDate(target);
  }
}

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
  // 中介層啟動時非同步巡檢資料庫陳舊度
  if (isSqliteSupported()) {
    try {
      const db = initSqliteLakehouseDb(customDbPath);
      const twMax = db.prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = '0050' OR symbol = '2330'").get();
      const expectedTwAnchor = getMarketAnchorDate('TW');
      if (twMax && twMax.maxDate && twMax.maxDate < expectedTwAnchor) {
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

    // 0. GET /api/market/sync-status (Spec 0160)
    if (pathname === '/api/market/sync-status') {
      const twMaxRow = db.prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = '0050' OR symbol = '2330'").get();
      const usMaxRow = db.prepare("SELECT MAX(date) as maxDate FROM daily_candles WHERE symbol = 'SPY' OR symbol = 'VOO' OR symbol = 'NVDA'").get();

      const twLatest = twMaxRow?.maxDate || null;
      const usLatest = usMaxRow?.maxDate || null;
      const twAnchor = getMarketAnchorDate('TW');
      const usAnchor = getMarketAnchorDate('US');

      const isTwStale = Boolean(twLatest && twLatest < twAnchor);
      const isUsStale = Boolean(usLatest && usLatest < usAnchor);

      if (query.catchup === 'true' && (isTwStale || isUsStale)) {
        triggerCatchupTask(customDbPath);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          tw: { latestDate: twLatest, anchorDate: twAnchor, isStale: isTwStale },
          us: { latestDate: usLatest, anchorDate: usAnchor, isStale: isUsStale },
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
