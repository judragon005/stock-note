/**
 * vite-market-middleware.cjs
 * Vite 原生 Connect 中介層 API
 * 提供零連接埠、零跨域的本機 SQLite REST API
 */

const url = require('url');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  getTwMarketBreadthAndSpotSummary,
  isSqliteSupported,
} = require('./sqlite-db-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');
const { getMarketAnchorDate, checkMarketFreshness } = require('./market-freshness-service.cjs');
const {
  fetchFullMacroWarRoomPulse,
  ingestMacroSentimentToDb,
} = require('./ingest-macro-sentiment.cjs');

const DEFAULT_CATCHUP_COOLDOWN_MS = 10 * 60 * 1000; // 預設 10 分鐘冷卻保護防線 (Spec 0165)
const CATCHUP_COOLDOWN_MS = Number(process.env.MARKET_CATCHUP_COOLDOWN_MS) || DEFAULT_CATCHUP_COOLDOWN_MS;
const MACRO_PULSE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 分鐘宏觀脈搏快取 (Spec 0209)

let isCatchingUp = false;
let lastCatchupTime = 0;
let cachedMacroPulse = null;
let cachedMacroPulseAt = 0;

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
  cachedMacroPulse = null;
  cachedMacroPulseAt = 0;
}

function setLastCatchupTimeForTest(time) {
  lastCatchupTime = time;
}

/**
 * 安全解析請求之 JSON Body (防 DoS 1MB 上限)
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Invalid JSON Payload'));
      }
    });
    req.on('error', (err) => reject(err));
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

    // 0.05 GET /api/market/macro (Spec 0209 Tickets 02, 03, 05 宏觀戰情室 3.0 即時脈搏與市場廣度端點)
    if (pathname === '/api/market/macro' && (req.method || 'GET').toUpperCase() === 'GET') {
      const headers = req.headers || {};
      const fredApiKey = headers['x-fred-key'] || process.env.FRED_API_KEY || '';
      const finmindApiKey = headers['x-finmind-key'] || process.env.FINMIND_API_KEY || '';
      const finnhubApiKey = headers['x-finnhub-key'] || process.env.FINNHUB_API_KEY || '';
      const fmpApiKey = headers['x-fmp-key'] || process.env.FMP_API_KEY || '';
      const tiingoApiKey = headers['x-tiingo-key'] || process.env.TIINGO_API_KEY || '';
      const alphaVantageApiKey = headers['x-alphavantage-key'] || process.env.ALPHAVANTAGE_API_KEY || '';

      const forceRefresh = query.refresh === '1' || query.refresh === 'true';
      const now = Date.now();
      let existingRow = null;
      try {
        existingRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
      } catch {}

      const hasFreshCache =
        !forceRefresh &&
        cachedMacroPulse &&
        now - cachedMacroPulseAt < MACRO_PULSE_CACHE_TTL_MS &&
        existingRow;

      if (hasFreshCache) {
        const { twMarketBreadth, twInstitutionalSpot } = getTwMarketBreadthAndSpotSummary(db, {
          taiexChangePercent: cachedMacroPulse?.taiexChangePercent,
        });
        const asOfTimestamp = cachedMacroPulse.asOfTimestamp || new Date(cachedMacroPulseAt).toISOString();
        const dataObj = {
          ...(existingRow || {}),
          ...(cachedMacroPulse || {}),
          pulse: cachedMacroPulse,
          twMarketBreadth,
          twInstitutionalSpot,
          asOfTimestamp,
          sourceStatus: 'CACHED',
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ status: 'ok', data: dataObj, ...dataObj }));
      }

      fetchFullMacroWarRoomPulse({
        fredApiKey,
        finmindApiKey,
        finnhubApiKey,
        fmpApiKey,
        tiingoApiKey,
        alphaVantageApiKey,
      })
        .then((fullPulse) => {
          const hasLiveSignal =
            fullPulse &&
            (fullPulse.vixClose !== null ||
              fullPulse.treasuryYield10y !== null ||
              fullPulse.soxClose !== null ||
              fullPulse.taiexClose !== null ||
              fullPulse.cnnFearGreedScore !== null);

          if (hasLiveSignal) {
            const todayStr = fullPulse.date || new Date().toISOString().slice(0, 10);
            ingestMacroSentimentToDb(
              {
                date: todayStr,
                riskFreeRate3m: fullPulse.riskFreeRate3m,
                treasuryYield10y: fullPulse.treasuryYield10y,
                yieldSpread10y2y: fullPulse.yieldSpread10y2y,
                cnnFearGreedScore: fullPulse.cnnFearGreedScore,
                vixClose: fullPulse.vixClose,
                twPutCallRatio: fullPulse.twPutCallRatio ?? null,
                twForeignFuturesOi: fullPulse.twForeignFuturesOi ?? fullPulse.twFuturesNetOi ?? null,
                twTrustFuturesOi: fullPulse.twTrustFuturesOi ?? null,
              },
              customDbPath
            );
            cachedMacroPulse = fullPulse;
            cachedMacroPulseAt = Date.now();
          }

          let macroRow = null;
          try {
            macroRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
          } catch {}

          const { twMarketBreadth, twInstitutionalSpot } = getTwMarketBreadthAndSpotSummary(db, {
            taiexChangePercent: fullPulse?.taiexChangePercent,
          });
          const sourceStatus = hasLiveSignal ? 'LIVE' : 'CACHED';
          const asOfTimestamp = new Date().toISOString();
          const dataObj = {
            ...(macroRow || {}),
            ...(fullPulse || {}),
            pulse: fullPulse,
            twMarketBreadth,
            twInstitutionalSpot,
            asOfTimestamp,
            sourceStatus,
          };

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ status: 'ok', data: dataObj, ...dataObj }));
        })
        .catch(() => {
          let macroRow = null;
          try {
            macroRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
          } catch {}
          const { twMarketBreadth, twInstitutionalSpot } = getTwMarketBreadthAndSpotSummary(db);
          const asOfTimestamp = macroRow?.updated_at
            ? new Date(macroRow.updated_at).toISOString()
            : new Date().toISOString();
          const dataObj = {
            ...(macroRow || {}),
            pulse: cachedMacroPulse || null,
            twMarketBreadth,
            twInstitutionalSpot,
            asOfTimestamp,
            sourceStatus: 'CACHED',
          };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ status: 'ok', data: dataObj, ...dataObj }));
        });
      return;
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

    // 0.5 POST /api/market/probe-key (Spec 0203 / Ticket 01)
    if (pathname === '/api/market/probe-key' && (req.method || 'GET').toUpperCase() === 'POST') {
      readJsonBody(req)
        .then(async (body) => {
          const targetUrl = body.targetUrl || body.url;
          if (!targetUrl || typeof targetUrl !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(
              JSON.stringify({
                error: 'MISSING_TARGET_URL',
                message: '請提供有效的 targetUrl 參數',
              })
            );
          }

          const method = (body.method || 'GET').toUpperCase();
          const incomingHeaders = body.headers || {};
          const headers = {
            'User-Agent': 'StockTracker/1.0 (local-probe)',
            ...incomingHeaders,
          };

          const start = Date.now();
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeout = setTimeout(() => {
            if (controller) controller.abort();
          }, 10000);

          try {
            const fetchOpts = {
              method,
              headers,
              signal: controller ? controller.signal : undefined,
            };
            if (body.payload && method !== 'GET') {
              fetchOpts.body = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload);
            }

            const response = await fetch(targetUrl, fetchOpts);
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            const text = await response.text();

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(
              JSON.stringify({
                ok: response.status >= 200 && response.status < 300,
                httpStatus: response.status,
                statusText: response.statusText || '',
                body: text,
                latencyMs,
              })
            );
          } catch (fetchErr) {
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(
              JSON.stringify({
                ok: false,
                httpStatus: 0,
                statusText: 'Network Error',
                error: fetchErr.message || 'Fetch failed',
                latencyMs,
              })
            );
          }
        })
        .catch((err) => {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'BODY_PARSE_ERROR', message: err.message }));
        });
      return;
    }

    // 0. GET /api/market/chips-snapshot (Spec 0217 / Ticket 01)
    if (pathname === '/api/market/chips-snapshot') {
      const market = String(query.market || 'TW').toUpperCase();
      const days = parseInt(query.days, 10) || 5;
      const minSymbols = parseInt(query.minSymbols, 10) || 1500;

      if (market === 'TW') {
        try {
          // 1. 取得完整交易日 (防禦單邊殘缺日)
          const dateRows = db
            .prepare(
              'SELECT date FROM tw_institutional_chips GROUP BY date HAVING COUNT(*) >= ? ORDER BY date DESC LIMIT ?'
            )
            .all(minSymbols, days);

          let dates = dateRows.map((r) => r.date);
          if (dates.length === 0) {
            const fallbackRows = db
              .prepare('SELECT DISTINCT date FROM tw_institutional_chips ORDER BY date DESC LIMIT ?')
              .all(days);
            dates = fallbackRows.map((r) => r.date);
          }

          if (dates.length === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(
              JSON.stringify({
                success: true,
                market: 'TW',
                availableDates: [],
                items: {},
              })
            );
          }

          // Spec 0218 Ticket 03 (#436): 往前多撈取 1 個交易日的收盤價作為基準前收價 (basePrice / previousClose)
          let baseDate = null;
          const basePrices = {};
          try {
            const earliestDate = dates[dates.length - 1];
            const prevDateRow = db
              .prepare("SELECT MAX(date) as prevDate FROM daily_candles WHERE date < ? AND (symbol = '0050' OR symbol = '2330')")
              .get(earliestDate);
            baseDate = prevDateRow?.prevDate || null;
            if (!baseDate) {
              const fallbackDateRow = db
                .prepare("SELECT MAX(date) as prevDate FROM daily_candles WHERE date < ?")
                .get(earliestDate);
              baseDate = fallbackDateRow?.prevDate || null;
            }
            if (baseDate) {
              const baseRows = db
                .prepare("SELECT symbol, close FROM daily_candles WHERE date = ?")
                .all(baseDate);
              for (const r of baseRows) {
                if (r.symbol && r.close != null) {
                  basePrices[r.symbol] = r.close;
                }
              }
            }
          } catch (e) {}

          const placeholders = dates.map(() => '?').join(',');
          const querySql = `
            SELECT 
              c.symbol, c.date, c.foreign_net, c.trust_net, c.dealer_net, c.margin_balance, c.short_balance,
              d.close, d.volume,
              m.name, m.industry, m.type
            FROM tw_institutional_chips c
            LEFT JOIN daily_candles d ON c.symbol = d.symbol AND c.date = d.date
            LEFT JOIN symbols_meta m ON c.symbol = m.symbol
            WHERE c.date IN (${placeholders})
            ORDER BY c.symbol, c.date ASC
          `;

          const rows = db.prepare(querySql).all(...dates);
          const items = {};

          for (const row of rows) {
            if (!items[row.symbol]) {
              items[row.symbol] = {
                symbol: row.symbol,
                name: row.name || row.symbol,
                industry: row.industry || '',
                type: row.type || 'STOCK',
                close: 0,
                basePrice: basePrices[row.symbol] ?? null,
                previousClose: basePrices[row.symbol] ?? null,
                volumeLots: 0,
                foreignNet: 0,
                trustNet: 0,
                dealerNet: 0,
                totalNetShares: 0,
                marginBalance: 0,
                shortBalance: 0,
                history: [],
              };
            }
            const item = items[row.symbol];
            const volLots = Math.round((row.volume || 0) / 1000);
            const foreign = row.foreign_net || 0;
            const trust = row.trust_net || 0;
            const dealer = row.dealer_net || 0;
            const totalNet = foreign + trust + dealer;

            if (row.close != null) {
              item.close = row.close;
            }
            item.volumeLots = volLots;
            item.foreignNet = foreign;
            item.trustNet = trust;
            item.dealerNet = dealer;
            item.totalNetShares = totalNet;
            item.marginBalance = row.margin_balance || 0;
            item.shortBalance = row.short_balance || 0;

            const prevCloseForDay = item.history.length === 0
              ? (item.basePrice ?? null)
              : (item.history[item.history.length - 1].close ?? null);
            const curClose = row.close ?? 0;
            const changePercent = prevCloseForDay && prevCloseForDay > 0
              ? Number((((curClose - prevCloseForDay) / prevCloseForDay) * 100).toFixed(2))
              : 0;

            item.history.push({
              date: row.date,
              close: curClose,
              previousClose: prevCloseForDay,
              changePercent,
              volumeLots: volLots,
              foreignNet: foreign,
              trustNet: trust,
              dealerNet: dealer,
              totalNetShares: totalNet,
            });
          }

          // 重新校準個股總累計漲跌幅 (5D 完整覆蓋基準日)
          for (const item of Object.values(items)) {
            if (item.basePrice && item.basePrice > 0 && item.close > 0) {
              item.cumulativeChangePercent = Number((((item.close - item.basePrice) / item.basePrice) * 100).toFixed(2));
            } else if (item.history.length > 0) {
              const first = item.history[0];
              if (first.previousClose && first.previousClose > 0 && item.close > 0) {
                item.cumulativeChangePercent = Number((((item.close - first.previousClose) / first.previousClose) * 100).toFixed(2));
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(
            JSON.stringify({
              success: true,
              market: 'TW',
              baseDate,
              availableDates: dates,
              items,
            })
          );
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      } else {
        // 美股快照
        try {
          const usDays = days * 5;
          const symbolsParam = query.symbols ? String(query.symbols).split(',').map((s) => s.trim().toUpperCase()) : [];

          let metas = [];
          if (symbolsParam.length > 0) {
            const placeholders = symbolsParam.map(() => '?').join(',');
            metas = db.prepare(`SELECT symbol, name, industry, type FROM symbols_meta WHERE symbol IN (${placeholders})`).all(...symbolsParam);
          } else {
            metas = db.prepare('SELECT symbol, name, industry, type FROM symbols_meta WHERE market = "US" LIMIT 100').all();
          }

          const items = {};
          for (const m of metas) {
            const candles = db
              .prepare('SELECT date, open, high, low, close, volume FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT ?')
              .all(m.symbol, usDays);

            const ascCandles = candles.reverse();
            const latest = ascCandles[ascCandles.length - 1] || {};
            items[m.symbol] = {
              symbol: m.symbol,
              name: m.name || m.symbol,
              industry: m.industry || '',
              type: m.type || 'STOCK',
              close: latest.close || 0,
              volume: latest.volume || 0,
              history: ascCandles,
            };
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(
            JSON.stringify({
              success: true,
              market: 'US',
              items,
            })
          );
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
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

    // 2.2 GET /api/market/financials/:symbol (Spec 0203 / Ticket 08)
    const finMatch = pathname.match(/^\/api\/market\/financials\/([A-Za-z0-9\-_]+)$/);
    if (finMatch && (req.method || 'GET').toUpperCase() === 'GET') {
      const symbol = finMatch[1].toUpperCase();
      const aliasSym = symbol.endsWith('O') ? symbol.slice(0, -1) : `${symbol}O`;
      const isAll = String(query.limit || '').trim().toLowerCase() === 'all';
      const limit = isAll ? -1 : (parseInt(query.limit, 10) || 20);

      try {
        const sql = `SELECT * FROM financial_statements_quarterly
             WHERE symbol IN (?, ?)
             ORDER BY year DESC, quarter DESC
             ${limit > 0 ? 'LIMIT ?' : ''}`;
        const params = limit > 0 ? [symbol, aliasSym, limit] : [symbol, aliasSym];
        const rows = db.prepare(sql).all(...params);

        const financials = rows.map((r) => ({
          symbol: r.symbol,
          market: r.market,
          year: r.year,
          quarter: r.quarter,
          revenue: r.revenue,
          grossProfit: r.gross_profit,
          operatingIncome: r.operating_income,
          netIncome: r.net_income,
          eps: r.eps,
          totalAssets: r.total_assets,
          totalLiabilities: r.total_liabilities,
          totalEquity: r.total_equity,
          currentAssets: r.current_assets,
          currentLiabilities: r.current_liabilities,
          accountsReceivable: r.accounts_receivable,
          inventory: r.inventory,
          operatingCashFlow: r.operating_cash_flow,
          capitalExpenditure: r.capital_expenditure,
          freeCashFlow: r.free_cash_flow,
          cashDividendsPaid: r.cash_dividends_paid,
          updatedAt: r.updated_at,
        }));

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(
          JSON.stringify({
            symbol,
            count: financials.length,
            financials,
          })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: err.message, financials: [] }));
      }
    }

    // 2.3 POST /api/market/financials (Spec 0203 / Ticket 08 批次寫入)
    if (pathname === '/api/market/financials' && (req.method || 'GET').toUpperCase() === 'POST') {
      readJsonBody(req)
        .then((body) => {
          const records = Array.isArray(body) ? body : body.records;
          if (!Array.isArray(records) || records.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: 'EMPTY_RECORDS', message: 'records 必須為非空陣列' }));
          }

          const stmt = db.prepare(`
            INSERT INTO financial_statements_quarterly (
              symbol, market, year, quarter, revenue, gross_profit, operating_income,
              net_income, eps, total_assets, total_liabilities, total_equity,
              current_assets, current_liabilities, accounts_receivable, inventory,
              operating_cash_flow, capital_expenditure, free_cash_flow, cash_dividends_paid, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, year, quarter) DO UPDATE SET
              revenue = COALESCE(excluded.revenue, financial_statements_quarterly.revenue),
              gross_profit = COALESCE(excluded.gross_profit, financial_statements_quarterly.gross_profit),
              operating_income = COALESCE(excluded.operating_income, financial_statements_quarterly.operating_income),
              net_income = COALESCE(excluded.net_income, financial_statements_quarterly.net_income),
              eps = COALESCE(excluded.eps, financial_statements_quarterly.eps),
              total_assets = COALESCE(excluded.total_assets, financial_statements_quarterly.total_assets),
              total_liabilities = COALESCE(excluded.total_liabilities, financial_statements_quarterly.total_liabilities),
              total_equity = COALESCE(excluded.total_equity, financial_statements_quarterly.total_equity),
              current_assets = COALESCE(excluded.current_assets, financial_statements_quarterly.current_assets),
              current_liabilities = COALESCE(excluded.current_liabilities, financial_statements_quarterly.current_liabilities),
              accounts_receivable = COALESCE(excluded.accounts_receivable, financial_statements_quarterly.accounts_receivable),
              inventory = COALESCE(excluded.inventory, financial_statements_quarterly.inventory),
              operating_cash_flow = COALESCE(excluded.operating_cash_flow, financial_statements_quarterly.operating_cash_flow),
              capital_expenditure = COALESCE(excluded.capital_expenditure, financial_statements_quarterly.capital_expenditure),
              free_cash_flow = COALESCE(excluded.free_cash_flow, financial_statements_quarterly.free_cash_flow),
              cash_dividends_paid = COALESCE(excluded.cash_dividends_paid, financial_statements_quarterly.cash_dividends_paid),
              updated_at = excluded.updated_at
          `);

          const now = Date.now();
          let count = 0;
          db.exec('BEGIN TRANSACTION;');
          try {
            for (const r of records) {
              if (!r || !r.symbol || !r.year || !r.quarter) continue;
              const sym = String(r.symbol).trim().toUpperCase();
              const market = String(r.market || (sym.length === 4 && /^\d+$/.test(sym) ? 'TW' : 'US')).toUpperCase();
              stmt.run(
                sym,
                market,
                r.year,
                r.quarter,
                r.revenue ?? r.grossRevenue ?? null,
                r.grossProfit ?? null,
                r.operatingIncome ?? null,
                r.netIncome ?? null,
                r.eps ?? null,
                r.totalAssets ?? null,
                r.totalLiabilities ?? null,
                r.totalEquity ?? null,
                r.currentAssets ?? null,
                r.currentLiabilities ?? null,
                r.accountsReceivable ?? null,
                r.inventory ?? null,
                r.operatingCashFlow ?? null,
                r.capitalExpenditure ?? null,
                r.freeCashFlow ?? null,
                r.cashDividendsPaid ?? null,
                now
              );
              count++;
            }
            db.exec('COMMIT;');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: true, count }));
          } catch (dbErr) {
            db.exec('ROLLBACK;');
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: dbErr.message }));
          }
        })
        .catch((err) => {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: err.message }));
        });
      return;
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

      // 新增查詢最新 1 筆宏觀情緒指標 (Spec 0200 Ticket 01)
      let macroRow = null;
      try {
        macroRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
      } catch {}

      // 新增查詢最新 1 筆董監質押與內部人申報轉讓 (Spec 0219 Ticket 03)
      let pledgeRow = null;
      try {
        pledgeRow = db
          .prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol IN (?, ?) ORDER BY report_date DESC LIMIT 1')
          .get(symbol, aliasSym) || null;
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
          pledge: pledgeRow,
          macro: macroRow,
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
