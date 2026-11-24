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
  getMarketMultiHorizonBreadth,
  getTwRevenueDiffusionAndYoY,
  clearBreadthAnchorCache,
  isSqliteSupported,
} = require('./sqlite-db-core.cjs');
const { buildSymbolAliases } = require('./market-sync-core.cjs');
const { searchSymbolsMeta } = require('./seed-symbols-universe.cjs');
const { getMarketAnchorDate, checkMarketFreshness } = require('./market-freshness-service.cjs');
const {
  fetchFullMacroWarRoomPulse,
  ingestMacroSentimentToDb,
  getCoalescedLatestMacroSentiment,
} = require('./ingest-macro-sentiment.cjs');
const {
  ensureUsFundamentalsTable,
} = require('./us-fundamentals-ingestion.cjs');
const {
  ON_DEMAND_TIMEOUT_MS,
  isOnDemandBackfillInFlight,
  clearOnDemandBackfillState,
  runWithAbortTimeout,
  runWithNonBlockingTimeout,
  runOnDemandSymbolBackfill,
} = require('./on-demand-backfill-orchestrator.cjs');
const {
  fetchSecCompanyFactsServer,
} = require('./sec-edgar-proxy.cjs');
const {
  hasTdccSeriesGap,
} = require('./ingest-tw-tdcc.cjs');

const DEFAULT_CATCHUP_COOLDOWN_MS = 10 * 60 * 1000; // 預設 10 分鐘冷卻保護防線 (Spec 0165)
const CATCHUP_COOLDOWN_MS = Number(process.env.MARKET_CATCHUP_COOLDOWN_MS) || DEFAULT_CATCHUP_COOLDOWN_MS;
const MACRO_PULSE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 分鐘宏觀脈搏快取 (Spec 0209)
const NATIVE_FETCH = globalThis.fetch;

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
      const handlers = options.handlers || {};
      const runTwMarketSync = handlers.runTwMarketSync || require('./sync-tw-market.cjs').runTwMarketSync;
      const fetchAndIngestTwDailyData =
        handlers.fetchAndIngestTwDailyData || require('./backfill-tw-history-web.cjs').fetchAndIngestTwDailyData;
      const fetchAndIngestEtfDailyNav =
        handlers.fetchAndIngestEtfDailyNav || require('./ingest-macro-sentiment.cjs').fetchAndIngestEtfDailyNav;
      const runUsMarketSync = handlers.runUsMarketSync || require('./sync-us-market.cjs').runUsMarketSync;
      const runTdccIngestion = handlers.runTdccIngestion || require('./ingest-tw-tdcc.cjs').runTdccIngestion;
      const runMonthlyRevenueIngestion =
        handlers.runMonthlyRevenueIngestion || require('./ingest-tw-monthly-revenue.cjs').runMonthlyRevenueIngestion;
      const fetchAndIngestTwPledge =
        handlers.fetchAndIngestTwPledge || require('./ingest-tw-pledge.cjs').fetchAndIngestTwPledge;

      let freshness = options.freshnessOverride || null;
      if (!freshness) {
        try {
          const db = initSqliteLakehouseDb(customDbPath);
          freshness = checkMarketFreshness(db);
        } catch {}
      }

      await runTwMarketSync();

      // Spec 0241 Ticket 02: 針對 incompleteDates（最多近 5 個交易日）呼叫 backfill-tw-history-web 補抓缺漏欄位
      const incompleteDates = Array.isArray(freshness?.tw?.incompleteDates)
        ? freshness.tw.incompleteDates.slice(0, 5)
        : [];
      for (const targetDate of incompleteDates) {
        try {
          await fetchAndIngestTwDailyData(targetDate, {
            dbPath: customDbPath,
            force: true,
            throttleMs: 1000,
          });
        } catch (backfillErr) {
          console.warn(`[MarketCatchup] 半殘日 ${targetDate} 補抓警示:`, backfillErr.message);
        }
      }

      // 若缺少 etf_nav，補抓最新結算日 ETF 淨值
      if (freshness?.tw?.missingPlanes?.includes('etf_nav')) {
        try {
          const navDate = freshness.tw.latestDate || freshness.tw.anchorDate;
          await fetchAndIngestEtfDailyNav(customDbPath, navDate);
        } catch (etfErr) {
          console.warn(`[MarketCatchup] ETF 淨值補抓警示:`, etfErr.message);
        }
      }

      // 若美股陳舊，觸發美股盤後同步
      if (freshness?.us?.isStale) {
        try {
          await runUsMarketSync({ dbPath: customDbPath });
        } catch (usErr) {
          console.warn(`[MarketCatchup] 美股同步警示:`, usErr.message);
        }
      }

      try {
        await runTdccIngestion(customDbPath);
      } catch (tdccErr) {
        console.warn(`[MarketCatchup] TDCC 入庫警示:`, tdccErr.message);
      }

      try {
        await runMonthlyRevenueIngestion(customDbPath);
      } catch (revErr) {
        console.warn(`[MarketCatchup] 月營收入庫警示:`, revErr.message);
      }

      // Spec 0238: 每月 16 日後或質押表低於 10 筆時自動補齊董監事質押紀錄
      try {
        let needPledge = Boolean(handlers.fetchAndIngestTwPledge) || new Date().getDate() >= 16;
        if (!needPledge) {
          const db = initSqliteLakehouseDb(customDbPath);
          const pledgeRow = db.prepare('SELECT COUNT(*) AS n FROM tw_insider_pledge_records').get();
          if (!pledgeRow || Number(pledgeRow.n) < 10) {
            needPledge = true;
          }
        }
        if (needPledge && typeof fetchAndIngestTwPledge === 'function') {
          await fetchAndIngestTwPledge(customDbPath);
        }
      } catch (pledgeErr) {
        console.warn(`[MarketCatchup] 董監質押同步警示:`, pledgeErr.message);
      }

      // Spec 0239 T03: 同步台股注意與處置股票狀態
      try {
        const fetchAndTagTwStockStatuses =
          handlers.fetchAndTagTwStockStatuses ||
          require('./tag-tw-stock-status.cjs').fetchAndTagTwStockStatuses;
        if (typeof fetchAndTagTwStockStatuses === 'function') {
          await fetchAndTagTwStockStatuses(customDbPath);
        }
      } catch (statusErr) {
        console.warn(`[MarketCatchup] 注意/處置狀態同步警示:`, statusErr.message);
      }

      console.log(`[MarketCatchup] ✔ 背景聯網追趕同步完成 (含半殘日自癒、美股、TDCC 與月營收)！`);
    } catch (err) {
      console.warn(`[MarketCatchup] 背景追趕回補警告:`, err.message);
    } finally {
      clearBreadthAnchorCache();
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
  clearOnDemandBackfillState();
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
        const twRevenue = getTwRevenueDiffusionAndYoY(db);
        const asOfTimestamp = cachedMacroPulse.asOfTimestamp || new Date(cachedMacroPulseAt).toISOString();
        const dataObj = {
          ...(existingRow || {}),
          ...(cachedMacroPulse || {}),
          pulse: cachedMacroPulse,
          twMarketBreadth,
          twInstitutionalSpot,
          twRevenue,
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
                treasuryYield2y: fullPulse.treasuryYield2y,
                fedFundsRate: fullPulse.fedFundsRate,
                usCpiYoY: fullPulse.usCpiYoY,
                creditSpreadOas: fullPulse.creditSpreadOas,
                twMarginMaintenanceRatio: fullPulse.twMarginMaintenanceRatio ?? fullPulse.twMarginMaintenance,
                igSpreadOas: fullPulse.igSpreadOas,
                cccSpreadOas: fullPulse.cccSpreadOas,
                breakeven10y: fullPulse.breakeven10y,
                initialClaims: fullPulse.initialClaims,
                usMfgNewOrdersYoY: fullPulse.usMfgNewOrdersYoY,
                usMfgInventoriesYoY: fullPulse.usMfgInventoriesYoY,
                usOrdersMinusInvSpread: fullPulse.usOrdersMinusInvSpread,
                usIndustrialProdYoY: fullPulse.usIndustrialProdYoY,
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
          const twRevenue = getTwRevenueDiffusionAndYoY(db);
          const sourceStatus = hasLiveSignal ? 'LIVE' : 'CACHED';
          const asOfTimestamp = new Date().toISOString();
          const dataObj = {
            ...(macroRow || {}),
            ...(fullPulse || {}),
            pulse: fullPulse,
            twMarketBreadth,
            twInstitutionalSpot,
            twRevenue,
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
          const twRevenue = getTwRevenueDiffusionAndYoY(db);
          const asOfTimestamp = macroRow?.updated_at
            ? new Date(macroRow.updated_at).toISOString()
            : new Date().toISOString();
          const dataObj = {
            ...(macroRow || {}),
            pulse: cachedMacroPulse || null,
            twMarketBreadth,
            twInstitutionalSpot,
            twRevenue,
            asOfTimestamp,
            sourceStatus: 'CACHED',
          };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ status: 'ok', data: dataObj, ...dataObj }));
        });
      return;
    }

    // 0.08 GET /api/market/breadth (Spec 0221 / Ticket 01 多週期市場寬度與融資去槓桿端點)
    if (pathname === '/api/market/breadth' && (req.method || 'GET').toUpperCase() === 'GET') {
      try {
        const targetDate = query.date || query.targetDate || undefined;
        const breadthData = getMarketMultiHorizonBreadth(targetDate, db);
        const twRevenue = getTwRevenueDiffusionAndYoY(db);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(
          JSON.stringify({
            status: 'ok',
            success: true,
            data: { ...breadthData, twRevenue },
            twRevenue,
            ...breadthData,
          })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ status: 'error', success: false, error: err.message }));
      }
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

    // 2. GET /api/market/quote/:symbol (支援含點號代碼如 BRK.B 與雙向別名, Spec 0239 T01)
    const quoteMatch = pathname.match(/^\/api\/market\/quote\/([A-Za-z0-9.\-_]+)$/);
    if (quoteMatch && !quoteMatch[1].includes('..')) {
      const [symbol, aliasSym] = buildSymbolAliases(quoteMatch[1]);
      const meta = db.prepare('SELECT * FROM symbols_meta WHERE symbol IN (?, ?)').get(symbol, aliasSym);
      const latestCandle = db
        .prepare('SELECT * FROM daily_candles WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
        .get(symbol, aliasSym);

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

    // 2.1 GET /api/market/corporate-actions/:symbol (Spec 0188 / Spec 0239 T01)
    const caMatch = pathname.match(/^\/api\/market\/corporate-actions\/([A-Za-z0-9.\-_]+)$/);
    if (caMatch && !caMatch[1].includes('..')) {
      const [symbol, aliasSym] = buildSymbolAliases(caMatch[1]);
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

    // 2.2 GET /api/market/financials/:symbol (Spec 0203 / Spec 0239 T01 雙向欄位對齊 + 點號路由)
    const finMatch = pathname.match(/^\/api\/market\/financials\/([A-Za-z0-9.\-_]+)$/);
    if (finMatch && !finMatch[1].includes('..') && (req.method || 'GET').toUpperCase() === 'GET') {
      const [symbol, aliasSym] = buildSymbolAliases(finMatch[1]);
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
          periodDate: r.period_date || `${r.year}-${String(r.quarter * 3).padStart(2, '0')}-30`,
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
          cashAndEquivalents: r.cash_and_equivalents ?? 0,
          shortTermDebt: r.short_term_debt ?? null,
          longTermDebt: r.long_term_debt ?? null,
          capitalStock: r.capital_stock ?? null,
          operatingCashFlow: r.operating_cash_flow,
          capitalExpenditure: r.capital_expenditure,
          freeCashFlow: r.free_cash_flow,
          cashDividendsPaid: r.cash_dividends_paid,
          dividendPaid: r.cash_dividends_paid,
          interestPaid: r.interest_paid ?? null,
          source: r.source ?? undefined,
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

    // 2.3 POST /api/market/financials (Spec 0203 / Spec 0239 T01 批次寫入雙向欄位無損保留)
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
              symbol, market, year, quarter, period_date, revenue, gross_profit, operating_income,
              net_income, eps, total_assets, total_liabilities, total_equity,
              current_assets, current_liabilities, accounts_receivable, inventory,
              cash_and_equivalents, short_term_debt, long_term_debt, capital_stock,
              operating_cash_flow, capital_expenditure, free_cash_flow, cash_dividends_paid,
              interest_paid, source, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, year, quarter) DO UPDATE SET
              period_date = COALESCE(excluded.period_date, financial_statements_quarterly.period_date),
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
              cash_and_equivalents = COALESCE(excluded.cash_and_equivalents, financial_statements_quarterly.cash_and_equivalents),
              short_term_debt = COALESCE(excluded.short_term_debt, financial_statements_quarterly.short_term_debt),
              long_term_debt = COALESCE(excluded.long_term_debt, financial_statements_quarterly.long_term_debt),
              capital_stock = COALESCE(excluded.capital_stock, financial_statements_quarterly.capital_stock),
              operating_cash_flow = COALESCE(excluded.operating_cash_flow, financial_statements_quarterly.operating_cash_flow),
              capital_expenditure = COALESCE(excluded.capital_expenditure, financial_statements_quarterly.capital_expenditure),
              free_cash_flow = COALESCE(excluded.free_cash_flow, financial_statements_quarterly.free_cash_flow),
              cash_dividends_paid = COALESCE(excluded.cash_dividends_paid, financial_statements_quarterly.cash_dividends_paid),
              interest_paid = COALESCE(excluded.interest_paid, financial_statements_quarterly.interest_paid),
              source = COALESCE(excluded.source, financial_statements_quarterly.source),
              updated_at = excluded.updated_at
          `);

          const now = Date.now();
          let count = 0;
          db.exec('BEGIN TRANSACTION;');
          try {
            for (const r of records) {
              if (!r || !r.symbol || !r.year || !r.quarter) continue;
              const sym = String(r.symbol).trim().toUpperCase();
              const market = String(r.market || (/^\d{4,6}[A-Z]?$/.test(sym) ? 'TW' : 'US')).toUpperCase();
              stmt.run(
                sym,
                market,
                r.year,
                r.quarter,
                r.periodDate ?? r.period_date ?? null,
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
                r.cashAndEquivalents ?? r.cash_and_equivalents ?? null,
                r.shortTermDebt ?? r.short_term_debt ?? null,
                r.longTermDebt ?? r.long_term_debt ?? null,
                r.capitalStock ?? r.capital_stock ?? null,
                r.operatingCashFlow ?? null,
                r.capitalExpenditure ?? null,
                r.freeCashFlow ?? null,
                r.cashDividendsPaid ?? r.dividendPaid ?? r.cash_dividends_paid ?? null,
                r.interestPaid ?? r.interest_paid ?? null,
                r.source ?? null,
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

    // 2.4 GET /api/market/sec-edgar/companyfacts/:symbol (Spec 0239 T07 本地 SEC EDGAR 代理與動態 CIK)
    const secMatch = pathname.match(/^\/api\/market\/sec-edgar\/companyfacts\/([A-Za-z0-9.\-_]+)$/);
    if (secMatch && !secMatch[1].includes('..') && (req.method || 'GET').toUpperCase() === 'GET') {
      const targetSym = decodeURIComponent(secMatch[1]).trim().toUpperCase();
      fetchSecCompanyFactsServer(targetSym)
        .then((facts) => {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify(facts));
        })
        .catch((err) => {
          const code = Number(err?.statusCode) || 502;
          res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(
            JSON.stringify({
              error: err?.message || 'SEC_EDGAR_PROXY_ERROR',
              symbol: targetSym,
            })
          );
        });
      return;
    }

    // 3. GET /api/market/history/:symbol?limit=250 (支援含點號代碼如 BRK.B 與雙向別名, Spec 0239 T01)
    const historyMatch = pathname.match(/^\/api\/market\/history\/([A-Za-z0-9.\-_]+)$/);
    if (historyMatch && !historyMatch[1].includes('..')) {
      const [symbol, aliasSym] = buildSymbolAliases(historyMatch[1]);
      const isAll = String(query.limit || '').trim().toLowerCase() === 'all';
      const limit = isAll ? 0 : (parseInt(query.limit, 10) || 250);

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

      // 新增查詢 TDCC 集保股權分散表 (最近 12 筆週別資料，支援雙向別名防斷層，Spec 0245 T09)
      let tdccRows = [];
      try {
        tdccRows = db
          .prepare('SELECT * FROM tw_tdcc_distribution WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 12')
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

      // 新增查詢官方每日估值與自身歷史倍數數列 (PE/PB/Yield，Spec 0197 & Spec 0199 & Spec 0239 T06)
      let valRow = null;
      let valHistory = [];
      try {
        valRow = db
          .prepare('SELECT pe, pb, dividend_yield, date FROM tw_valuation_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
          .get(symbol, aliasSym) || null;

        valHistory = db
          .prepare('SELECT pe, pb, dividend_yield, date FROM tw_valuation_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 250')
          .all(symbol, aliasSym) || [];
        valHistory.reverse();
      } catch {}

      // 新增查詢最新 7 筆逐欄非空合併宏觀情緒指標 (Spec 0239 T04)
      let macroRow = null;
      try {
        macroRow = getCoalescedLatestMacroSentiment(db, 7);
      } catch {
        try {
          macroRow = db.prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT 1').get() || null;
        } catch {}
      }

      // 新增查詢最新 1 筆董監質押與內部人申報轉讓 (Spec 0219 Ticket 03)
      let pledgeRow = null;
      try {
        pledgeRow = db
          .prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol IN (?, ?) ORDER BY report_date DESC LIMIT 1')
          .get(symbol, aliasSym) || null;
      } catch {}

      // 新增查詢最新 1 筆與近 30 日 ETF 官方淨值、折溢價、發行單位與實時規模 (Spec 0237 & Spec 0241 & Spec 0242)
      let etfNavRow = null;
      let etfNavHistory = [];
      try {
        const navRows = db
          .prepare('SELECT * FROM etf_daily_nav WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 30')
          .all(symbol, aliasSym);
        if (navRows.length > 0) {
          etfNavRow = navRows[0];
          etfNavHistory = navRows
            .map((r) => ({
              date: r.date,
              nav: r.nav != null ? Number(r.nav) : null,
              closePrice: (r.close_price ?? r.market_price) != null ? Number(r.close_price ?? r.market_price) : null,
              premiumDiscountRatio:
                (r.premium_discount_ratio ?? r.premium_discount_rate) != null
                  ? Number(r.premium_discount_ratio ?? r.premium_discount_rate)
                  : null,
            }))
            .reverse();
        }
      } catch {}

      // 新增查詢台股 ETF 元數據與實時費用率 (Spec 0241 T04 / Debt 0061 #3)
      let etfMetaRow = null;
      try {
        etfMetaRow = db
          .prepare('SELECT * FROM etf_meta WHERE symbol IN (?, ?) LIMIT 1')
          .get(symbol, aliasSym) || null;
      } catch {}

      // 新增查詢最近 16 筆除權息與重大行動行事曆 (Spec 0237 Ticket 05)
      let corporateActions = [];
      try {
        corporateActions = db
          .prepare('SELECT * FROM corporate_action_calendar WHERE symbol IN (?, ?) ORDER BY ex_date DESC LIMIT 16')
          .all(symbol, aliasSym) || [];
      } catch {}

      // 新增查詢美股基本面 / 13F / 美股 ETF 快取 (Spec 0239 T06)
      let usFundamentalsRow = null;
      try {
        ensureUsFundamentalsTable(db);
        usFundamentalsRow = db
          .prepare('SELECT * FROM us_fundamentals_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
          .get(symbol, aliasSym) || null;
      } catch {}

      // 新增查詢近期季度財報 (供美股 Card 20 近 8 季營收與 Card 21 首屏即時渲染, Spec 0239 T07)
      let quarterlyFinancials = [];
      try {
        quarterlyFinancials = db
          .prepare('SELECT * FROM financial_statements_quarterly WHERE symbol IN (?, ?) ORDER BY year DESC, quarter DESC LIMIT 12')
          .all(symbol, aliasSym) || [];
      } catch {}

      // Spec 0239 T05 & T06: 雙市場按需補齊 (非阻塞背景完成 + enrichmentPending 旗標供前端自動重繪)
      const isTwStock = meta?.market === 'TW' || /^\d{4,6}[A-Z]?$/.test(symbol);
      const isEtf = /^(00\d{2,4}[A-Z]?|01\d{3}[A-Z]?)$/i.test(symbol) || meta?.type === 'ETF';
      const todayStr = new Date().toISOString().slice(0, 10);
      const hasPastDividend = corporateActions.some((a) => a.ex_date && a.ex_date <= todayStr);

      const needTdcc = isTwStock && hasTdccSeriesGap(tdccRows, { minWeeks: 12 });
      const needRevenue = isTwStock && !isEtf && revenueRows.length < 6;
      const needDividend = isTwStock && !hasPastDividend;
      const usFundStale =
        !isTwStock &&
        (!usFundamentalsRow ||
          !usFundamentalsRow.updated_at ||
          Date.now() - Number(usFundamentalsRow.updated_at) > 24 * 60 * 60 * 1000);
      const needUsFundamentals = usFundStale;
      const needTwEtfMeta =
        isTwStock &&
        isEtf &&
        (!etfMetaRow ||
          !etfMetaRow.expense_source ||
          Date.now() - Number(etfMetaRow.updated_at || 0) > 30 * 24 * 60 * 60 * 1000);

      const sendHistoryResponse = (enrichmentPending = false) => {
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
            usFundamentals: usFundamentalsRow,
            quarterlyFinancials,
            pledge: pledgeRow,
            etfNav: etfNavRow,
            etfNavHistory,
            etfMeta: etfMetaRow,
            corporateActions,
            macro: macroRow,
            enrichmentPending: Boolean(enrichmentPending),
          })
        );
      };

      const isUnmockedTestEnv =
        (process.env.NODE_ENV === 'test' || process.env.VITEST) &&
        globalThis.fetch === NATIVE_FETCH;

      const needsAnyBackfill =
        needTdcc || needRevenue || needDividend || needUsFundamentals || needTwEtfMeta;
      if (needsAnyBackfill && typeof globalThis.fetch === 'function' && !isUnmockedTestEnv) {
        return runWithNonBlockingTimeout(
          (signal) =>
            runOnDemandSymbolBackfill(symbol, {
              needTdcc,
              needRevenue,
              needDividend,
              needUsFundamentals,
              needTwEtfMeta,
              customDbPath,
              signal,
            }),
          ON_DEMAND_TIMEOUT_MS
        ).then(({ timedOut }) => {
          try {
            if (needTdcc) {
              tdccRows = db
                .prepare('SELECT * FROM tw_tdcc_distribution WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 12')
                .all(symbol, aliasSym);
              tdccRows.reverse();
            }
            if (needRevenue) {
              revenueRows = db
                .prepare('SELECT * FROM tw_monthly_revenue WHERE symbol IN (?, ?) ORDER BY year_month DESC LIMIT 12')
                .all(symbol, aliasSym);
              revenueRows.reverse();
            }
            if (needDividend || needUsFundamentals) {
              corporateActions = db
                .prepare('SELECT * FROM corporate_action_calendar WHERE symbol IN (?, ?) ORDER BY ex_date DESC LIMIT 16')
                .all(symbol, aliasSym) || [];
            }
            if (needUsFundamentals) {
              usFundamentalsRow = db
                .prepare('SELECT * FROM us_fundamentals_daily WHERE symbol IN (?, ?) ORDER BY date DESC LIMIT 1')
                .get(symbol, aliasSym) || null;
            }
            if (needTwEtfMeta) {
              etfMetaRow = db
                .prepare('SELECT * FROM etf_meta WHERE symbol IN (?, ?) LIMIT 1')
                .get(symbol, aliasSym) || null;
            }
          } catch {}
          const stillPending = timedOut && isOnDemandBackfillInFlight(symbol);
          return sendHistoryResponse(stillPending);
        });
      }

      return sendHistoryResponse(isOnDemandBackfillInFlight(symbol));
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
