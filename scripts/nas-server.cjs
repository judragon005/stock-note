/**
 * nas-server.cjs
 * 零外部依賴 Node.js 22 原生 NAS / Docker 輕量生產伺服器 (Spec 0242)
 * 單一進程整合：
 * 1. dist/ 靜態前端 SPA 託管 (記憶體佔用 < 80MB)
 * 2. /api/market/* SQLite 數據湖倉 REST API
 * 3. /api/yahoo/* Yahoo Finance 反向代理
 * 4. 24/7 無人值守自治排程器 (免開網頁自動每日/每週更新)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createMarketApiMiddleware } = require('./market-sync/vite-market-middleware.cjs');
const { startNasAutonomousScheduler } = require('./market-sync/nas-autonomous-scheduler.cjs');
const { getDbPath } = require('./market-sync/sqlite-db-core.cjs');

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

async function handleYahooProxy(req, res) {
  try {
    const targetPath = req.url.replace(/^\/api\/yahoo/, '') || '/';
    const targetUrl = `https://query1.finance.yahoo.com${targetPath}`;
    const upstream = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Referer: 'https://finance.yahoo.com/',
        Accept: 'application/json, text/plain, */*',
      },
    });
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, { 'Content-Type': contentType });
    res.end(buf);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'YAHOO_PROXY_ERROR', message: err?.message || 'Upstream unavailable' }));
  }
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
  const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
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
} = {}) {
  const marketMiddleware = createMarketApiMiddleware(customDbPath);
  const scheduler = enableScheduler ? startNasAutonomousScheduler({ customDbPath }) : null;

  const server = http.createServer((req, res) => {
    setSecurityHeaders(res);

    if (req.url && req.url.startsWith('/api/market/')) {
      return marketMiddleware(req, res, () => {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'API_NOT_FOUND' }));
      });
    }

    if (req.url && req.url.startsWith('/api/yahoo')) {
      handleYahooProxy(req, res);
      return;
    }

    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(
        JSON.stringify({
          status: 'ok',
          dbPath: getDbPath(customDbPath),
          scheduler: scheduler ? scheduler.getState?.() || { enabled: true } : { enabled: false },
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

  return { server, scheduler };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const { server } = createNasServer();
  server.listen(port, host, () => {
    console.log(`🚀 [NAS Server] 股票戰情室生產伺服器已啟動於 http://${host}:${port}`);
    console.log(`💾 [NAS Server] SQLite 數據湖倉路徑: ${getDbPath()}`);
    console.log(`⏰ [NAS Server] 24/7 無人值守自治排程器運行中 (無需開啟瀏覽器即可自動每日/每週更新)`);
  });
}

module.exports = {
  createNasServer,
};
