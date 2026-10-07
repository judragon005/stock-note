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
      const targetDays = parseInt(query.days, 10) || 250;
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

      let meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get(symbol);
      let candles = db
        .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT ?')
        .all(symbol, limit);

      // 若查無日 K 且符合台股特徵，嘗試別名回退探測 (Debt 0043 / Spec 0168)
      if (candles.length === 0 && /^\d{2,}/.test(symbol)) {
        const aliasSym = symbol.endsWith('O') ? symbol.slice(0, -1) : `${symbol}O`;
        const aliasCandles = db
          .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT ?')
          .all(aliasSym, limit);
        if (aliasCandles.length > 0) {
          candles = aliasCandles;
          if (!meta) {
            meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get(aliasSym);
          }
        }
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
            'SELECT * FROM tw_institutional_chips WHERE symbol = ? AND date >= ? AND date <= ? ORDER BY date ASC'
          )
          .all(symbol, minDate, maxDate);

        for (const row of chipsRows) {
          chipsMap[row.date] = row;
        }
      }

      // 新增查詢 TDCC 集保股權分散表 (最近 10 筆週別資料)
      let tdccRows = [];
      try {
        tdccRows = db
          .prepare('SELECT * FROM tw_tdcc_distribution WHERE symbol = ? ORDER BY date DESC LIMIT 10')
          .all(symbol);
        tdccRows.reverse();
      } catch {}

      // 新增查詢月營收 (最近 12 個月)
      let revenueRows = [];
      try {
        revenueRows = db
          .prepare('SELECT * FROM tw_monthly_revenue WHERE symbol = ? ORDER BY year_month DESC LIMIT 12')
          .all(symbol);
        revenueRows.reverse();
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
