/**
 * nas-server.cjs
 * 零外部依賴 Node.js 22 原生 NAS / Docker 唯一權威生產伺服器 (Spec 0242 / Spec 0243 SSOT)
 * 單一進程整合：
 * 1. dist/ 靜態前端 SPA 託管 (記憶體佔用 < 80MB)
 * 2. /api/market/* SQLite 數據湖倉 REST API
 * 3. 全量外部反向代理 (/api/yahoo, /api/fred, /api/twse-www, /api/twse, /api/tpex, SSRF 白名單 /api/proxy)
 * 4. 24/7 無人值守自治排程器 (每日台美股+宏觀、每週滾動快照) 與 SIGTERM/SIGINT WAL 優雅關機
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createMarketApiMiddleware } = require('./market-sync/vite-market-middleware.cjs');
const { startNasAutonomousScheduler } = require('./market-sync/nas-autonomous-scheduler.cjs');
const { getDbPath, checkpointSqliteWal, closeSqliteDb } = require('./market-sync/sqlite-db-core.cjs');
const { getCoordinatorTelemetry } = require('./market-sync/lakehouse-sync-coordinator.cjs');
const {
  validateOutboundTargetUrl,
  isRedirectResponseStatus,
} = require('./market-sync/ssrf-origin-guard.cjs');

const DEFAULT_MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1MB
const DEFAULT_MAX_RESPONSE_BODY_BYTES = 20 * 1024 * 1024; // 20MB (保護 80MB 容器免於 OOM)
const DEFAULT_UPSTREAM_TIMEOUT_MS = 15000; // 15s

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// 注意：/api/twse-www 必須排在 /api/twse 之前避免前綴誤匹配
const PREFIX_PROXY_ROUTES = [
  {
    prefix: '/api/yahoo',
    targetOrigin: 'https://query1.finance.yahoo.com',
    extraHeaders: { Referer: 'https://finance.yahoo.com/' },
    errorCode: 'YAHOO_PROXY_ERROR',
  },
  {
    prefix: '/api/twse-www',
    targetOrigin: 'https://www.twse.com.tw',
    extraHeaders: { Referer: 'https://www.twse.com.tw/' },
    errorCode: 'TWSE_WWW_PROXY_ERROR',
  },
  {
    prefix: '/api/twse',
    targetOrigin: 'https://openapi.twse.com.tw',
    extraHeaders: {},
    errorCode: 'TWSE_PROXY_ERROR',
  },
  {
    prefix: '/api/tpex',
    targetOrigin: 'https://www.tpex.org.tw',
    extraHeaders: {},
    errorCode: 'TPEX_PROXY_ERROR',
  },
  {
    prefix: '/api/fred',
    targetOrigin: 'https://api.stlouisfed.org',
    extraHeaders: {},
    errorCode: 'FRED_PROXY_ERROR',
  },
];

function matchPrefixProxyRoute(reqUrl) {
  if (!reqUrl) return null;
  const pathname = reqUrl.split('?')[0];
  for (const route of PREFIX_PROXY_ROUTES) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route;
    }
  }
  return null;
}

function safeSendJson(res, statusCode, payload, extraHeaders = {}) {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req, maxBytes = DEFAULT_MAX_REQUEST_BODY_BYTES, signal = undefined) {
  return new Promise((resolve, reject) => {
    const contentLengthHeader = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > maxBytes) {
      const err = new Error(`Request Content-Length (${contentLengthHeader}) exceeds limit (${maxBytes} bytes)`);
      err.code = 'PAYLOAD_TOO_LARGE';
      req.pause();
      reject(err);
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('aborted', onAborted);
      req.removeListener('close', onClose);
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', onSignalAbort);
      }
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onSignalAbort = () => {
      const err = new Error('Request body read timed out');
      err.name = 'AbortError';
      req.pause();
      fail(err);
    };

    const onData = (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        const err = new Error(`Request body exceeds limit (${maxBytes} bytes)`);
        err.code = 'PAYLOAD_TOO_LARGE';
        req.pause();
        fail(err);
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks));
    };

    const onError = (err) => fail(err);
    const onAborted = () => fail(new Error('Client aborted request'));
    const onClose = () => {
      if (!settled && !req.complete) {
        fail(new Error('Client closed connection before body completed'));
      }
    };

    if (signal?.aborted) {
      onSignalAbort();
      return;
    }
    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', onSignalAbort, { once: true });
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAborted);
    req.on('close', onClose);
  });
}

async function forwardUpstream(
  req,
  res,
  targetUrl,
  {
    upstreamFetcher,
    extraHeaders = {},
    responseHeaders = {},
    errorCode,
    maxRequestBodyBytes = DEFAULT_MAX_REQUEST_BODY_BYTES,
    maxResponseBodyBytes = DEFAULT_MAX_RESPONSE_BODY_BYTES,
    upstreamTimeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
  }
) {
  let controller = null;
  let timer = null;
  try {
    const method = (req.method || 'GET').toUpperCase();
    const headers = {
      'User-Agent': DEFAULT_UA,
      Accept: 'application/json, text/plain, */*',
      ...extraHeaders,
    };
    if (req.headers && req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller && upstreamTimeoutMs > 0) {
      timer = setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, upstreamTimeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
    }

    const fetchInit = {
      method,
      headers,
      redirect: 'manual',
      signal: controller ? controller.signal : undefined,
    };

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const bodyBuf = await readRequestBody(req, maxRequestBodyBytes, controller ? controller.signal : undefined);
      if (bodyBuf.length > 0) {
        fetchInit.body = bodyBuf;
      }
    }

    const upstream = await upstreamFetcher(targetUrl, fetchInit);

    // Spec 0247 T03: 攔截 3xx 重導向防止 Open Redirect SSRF 繞過
    if (isRedirectResponseStatus(upstream.status)) {
      safeSendJson(
        res,
        403,
        {
          error: 'SSRF_REDIRECT_BLOCKED',
          status: upstream.status,
          message: '上游回傳 3xx 重導向已遭安全護欄阻斷',
        },
        responseHeaders
      );
      return;
    }

    const upstreamContentLength = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(upstreamContentLength) && upstreamContentLength > maxResponseBodyBytes) {
      safeSendJson(
        res,
        502,
        {
          error: 'UPSTREAM_RESPONSE_TOO_LARGE',
          message: `Upstream Content-Length (${upstreamContentLength}) exceeds limit (${maxResponseBodyBytes} bytes)`,
        },
        responseHeaders
      );
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > maxResponseBodyBytes) {
      safeSendJson(
        res,
        502,
        {
          error: 'UPSTREAM_RESPONSE_TOO_LARGE',
          message: `Upstream response body (${buf.length}) exceeds limit (${maxResponseBodyBytes} bytes)`,
        },
        responseHeaders
      );
      return;
    }

    if (res.headersSent || res.writableEnded) return;
    res.writeHead(upstream.status, {
      'Content-Type': contentType,
      ...responseHeaders,
    });
    res.end(buf);
  } catch (err) {
    if (err && err.code === 'PAYLOAD_TOO_LARGE') {
      safeSendJson(res, 413, { error: 'PAYLOAD_TOO_LARGE', message: err.message }, responseHeaders);
      return;
    }
    if ((err && err.name === 'AbortError') || (controller && controller.signal && controller.signal.aborted)) {
      safeSendJson(
        res,
        504,
        { error: 'UPSTREAM_TIMEOUT', message: `Upstream request timed out after ${upstreamTimeoutMs}ms` },
        responseHeaders
      );
      return;
    }
    safeSendJson(res, 502, { error: errorCode, message: err?.message || 'Upstream unavailable' }, responseHeaders);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function handlePrefixProxy(req, res, route, upstreamFetcher, proxyLimits = {}) {
  const targetPath = req.url.slice(route.prefix.length) || '/';
  const targetUrl = `${route.targetOrigin}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
  return forwardUpstream(req, res, targetUrl, {
    upstreamFetcher,
    extraHeaders: route.extraHeaders,
    errorCode: route.errorCode,
    ...proxyLimits,
  });
}

async function handleGenericProxy(req, res, upstreamFetcher, proxyLimits = {}) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  let targetUrl = null;
  try {
    const parsedReq = new URL(req.url, 'http://localhost');
    targetUrl = parsedReq.searchParams.get('url');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
    return res.end(JSON.stringify({ error: 'Invalid request url' }));
  }

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
    return res.end(JSON.stringify({ error: 'Missing target url parameter' }));
  }

  const ssrfVerdict = validateOutboundTargetUrl(targetUrl);
  if (!ssrfVerdict.ok) {
    const statusCode = ssrfVerdict.code === 'INVALID_URL' ? 400 : 403;
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
    return res.end(
      JSON.stringify({
        error: statusCode === 400 ? 'Invalid target url' : 'Host not in proxy whitelist (SSRF Guard)',
        code: ssrfVerdict.code,
      })
    );
  }

  return forwardUpstream(req, res, ssrfVerdict.normalizedUrl.toString(), {
    upstreamFetcher,
    responseHeaders: corsHeaders,
    errorCode: 'GENERIC_PROXY_ERROR',
    ...proxyLimits,
  });
}

function getDbHealthMetrics(dbPath) {
  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }
  } catch {
    dbSizeBytes = 0;
  }

  let latestBackup = null;
  try {
    const dir = path.dirname(dbPath);
    const baseName = path.basename(dbPath, '.db');
    if (fs.existsSync(dir)) {
      const backupPrefix = `${baseName}.backup-`;
      const backupFiles = fs
        .readdirSync(dir)
        .filter((name) => name.startsWith(backupPrefix) && /\.backup-\d{8}\.db$/.test(name))
        .sort();
      if (backupFiles.length > 0) {
        const latestName = backupFiles[backupFiles.length - 1];
        const fullPath = path.join(dir, latestName);
        const stat = fs.statSync(fullPath);
        latestBackup = {
          fileName: latestName,
          path: fullPath,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      }
    }
  } catch {
    latestBackup = null;
  }

  return { dbSizeBytes, latestBackup };
}

function serveStaticFile(req, res, distDir) {
  const cleanUrl = (req.url || '/').split('?')[0];
  let safeRel = path.normalize(cleanUrl).replace(/^(\.\.[/\\])+/, '');
  if (safeRel === '/' || safeRel === '\\' || safeRel === '.') {
    safeRel = 'index.html';
  } else {
    safeRel = safeRel.replace(/^[/\\]+/, '');
  }

  const resolvedDist = path.resolve(distDir);
  let targetFile = path.resolve(resolvedDist, safeRel);

  // 防目錄遍歷攻擊
  if (!targetFile.startsWith(resolvedDist)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
    // SPA Fallback
    targetFile = path.join(resolvedDist, 'index.html');
  }

  if (!fs.existsSync(targetFile)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found (請先執行 npm run build 產出 dist/)');
  }

  const ext = path.extname(targetFile).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  // Spec 0246 Ticket 09: .html 與 .json 一律 no-cache，杜絕動態資料遭瀏覽器一年期 immutable 鎖死
  const cacheControl = ext === '.html' || ext === '.json' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(targetFile).pipe(res);
}

/**
 * 建立 NAS 生產環境 HTTP 伺服器與自治排程器
 */
function createNasServer({
  distDir = path.resolve(__dirname, '../dist'),
  customDbPath = undefined,
  enableScheduler = true,
  upstreamFetcher = fetch,
  maxRequestBodyBytes = DEFAULT_MAX_REQUEST_BODY_BYTES,
  maxResponseBodyBytes = DEFAULT_MAX_RESPONSE_BODY_BYTES,
  upstreamTimeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
} = {}) {
  const proxyLimits = { maxRequestBodyBytes, maxResponseBodyBytes, upstreamTimeoutMs };
  const resolvedDbPath = getDbPath(customDbPath);
  const marketMiddleware = createMarketApiMiddleware(customDbPath);
  const scheduler = enableScheduler ? startNasAutonomousScheduler({ customDbPath: resolvedDbPath }) : null;

  const server = http.createServer((req, res) => {
    setSecurityHeaders(res);

    if (req.url && req.url.startsWith('/api/market/')) {
      return marketMiddleware(req, res, () => {
        safeSendJson(res, 404, { error: 'API_NOT_FOUND' });
      });
    }

    if (req.url && (req.url === '/api/proxy' || req.url.startsWith('/api/proxy?'))) {
      handleGenericProxy(req, res, upstreamFetcher, proxyLimits).catch((err) => {
        safeSendJson(res, 502, { error: 'GENERIC_PROXY_ERROR', message: err?.message || 'Proxy error' });
      });
      return;
    }

    const prefixRoute = matchPrefixProxyRoute(req.url);
    if (prefixRoute) {
      handlePrefixProxy(req, res, prefixRoute, upstreamFetcher, proxyLimits).catch((err) => {
        safeSendJson(res, 502, { error: prefixRoute.errorCode, message: err?.message || 'Proxy error' });
      });
      return;
    }

    const reqPathname = (req.url || '/').split('?')[0];
    if (reqPathname === '/healthz') {
      const resolvedDbPath = getDbPath(customDbPath);
      const { dbSizeBytes, latestBackup } = getDbHealthMetrics(resolvedDbPath);
      const rawSchedulerState = scheduler?.getState?.();
      const schedulerState = scheduler
        ? { enabled: true, ...(rawSchedulerState || {}) }
        : { enabled: false };
      const coordinator = getCoordinatorTelemetry(resolvedDbPath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          status: 'ok',
          dbPath: resolvedDbPath,
          dbSizeBytes,
          scheduler: schedulerState,
          coordinator,
          latestBackup,
        })
      );
    }

    return serveStaticFile(req, res, distDir);
  });

  server.on('close', () => {
    if (scheduler && typeof scheduler.stop === 'function') {
      scheduler.stop();
    }
  });

  let shutdownPromise = null;
  async function gracefulShutdown(signal = 'SIGTERM', { timeoutMs = 8000 } = {}) {
    if (shutdownPromise) {
      const firstResult = await shutdownPromise;
      return { ...firstResult, signal, reentrant: true };
    }

    shutdownPromise = (async () => {
      // 1. 停止無頭自治排程器
      if (scheduler && typeof scheduler.stop === 'function') {
        try {
          scheduler.stop();
        } catch {
          // ignore
        }
      }

      // 2. 停止接收新 HTTP 連線並主動釋放 Keep-Alive 閒置連線 (含逾時保底)
      if (server.listening) {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, timeoutMs);
          if (typeof timer.unref === 'function') timer.unref();
          server.close(() => {
            clearTimeout(timer);
            resolve();
          });
          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
        });
      }

      // 3. 強制執行 SQLite WAL Checkpoint 落盤並安全關閉連線
      const cpResult = checkpointSqliteWal();
      closeSqliteDb();

      return {
        ok: true,
        signal,
        reentrant: false,
        walCheckpointed: Boolean(cpResult?.ok || cpResult?.skipped),
        checkpoint: cpResult,
      };
    })();

    return shutdownPromise;
  }

  return { server, scheduler, gracefulShutdown };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const { server, gracefulShutdown } = createNasServer();

  const handleExitSignal = (sig) => {
    console.log(`🛑 [NAS Server] 收到 ${sig} 訊號，開始執行優雅關機與 SQLite WAL 落盤...`);
    const forceTimer = setTimeout(() => {
      console.error('⚠️ [NAS Server] 優雅關機逾時，強制結束進程。');
      process.exit(1);
    }, 9000);
    if (typeof forceTimer.unref === 'function') forceTimer.unref();

    gracefulShutdown(sig, { timeoutMs: 8000 })
      .then(() => {
        clearTimeout(forceTimer);
        console.log('✅ [NAS Server] SQLite WAL 已落盤並安全關閉，進程乾淨退出 (Exit Code 0)。');
        process.exit(0);
      })
      .catch((err) => {
        clearTimeout(forceTimer);
        console.error('❌ [NAS Server] 優雅關機異常:', err?.message || err);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handleExitSignal('SIGTERM'));
  process.on('SIGINT', () => handleExitSignal('SIGINT'));

  server.listen(port, host, () => {
    console.log(`🚀 [NAS Server] 股票戰情室生產伺服器已啟動於 http://${host}:${port}`);
    console.log(`💾 [NAS Server] SQLite 數據湖倉路徑: ${getDbPath()}`);
    console.log(`⏰ [NAS Server] 24/7 無人值守自治排程器運行中 (無需開啟瀏覽器即可自動每日/每週更新)`);
  });
}

module.exports = {
  createNasServer,
  getDbHealthMetrics,
};
