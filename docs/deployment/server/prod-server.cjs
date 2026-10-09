/**
 * prod-server.cjs
 * QNAP NAS 生產環境專用輕量伺服器 (零第三方套件依賴)
 * 功能：託管前端 SPA 靜態檔 + 本地 SQLite Market API + CORS 代理轉發
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 向上逐層探索專案根目錄 (無縫相容 Docker /app 與本機任意層級目錄)
function findProjectRoot(startDir) {
  let curr = startDir;
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'scripts', 'market-sync', 'vite-market-middleware.cjs'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return startDir;
}

const ROOT_DIR = findProjectRoot(__dirname);
const scriptsPath = path.join(ROOT_DIR, 'scripts', 'market-sync', 'vite-market-middleware.cjs');

if (!fs.existsSync(scriptsPath)) {
  throw new Error(`無法找到 vite-market-middleware.cjs (搜尋根目錄: ${ROOT_DIR})`);
}
const { createMarketApiMiddleware } = require(scriptsPath);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const marketApi = createMarketApiMiddleware();

// 常用 MIME 類型對應
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * 代理對外請求 (解決瀏覽器 CORS 限制)
 */
function proxyRequest(req, res, targetHost, pathRewritePrefix) {
  const reqUrl = url.parse(req.url);
  const targetPath = reqUrl.pathname.replace(pathRewritePrefix, '') + (reqUrl.search || '');

  const options = {
    hostname: targetHost,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetHost,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  };

  delete options.headers['host'];

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
  });

  req.pipe(proxyReq);
}

/**
 * 靜態檔案託管 (含 SPA Fallback)
 */
function serveStatic(req, res) {
  let safePath = path.normalize(url.parse(req.url).pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        const fallbackPath = path.join(DIST_DIR, 'index.html');
        fs.readFile(fallbackPath, (fbErr, fbContent) => {
          if (fbErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found (請確認 dist 已建置)');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fbContent);
          }
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

/**
 * 通用白名單反向代理 (解決 FRED 等官方無 CORS 標頭問題)
 * 格式: /api/proxy?url=<encodeURIComponent(targetUrl)>
 */
const ALLOWED_PROXY_HOSTS = new Set([
  'api.stlouisfed.org',
  'finnhub.io',
  'financialmodelingprep.com',
  'api.finmindtrade.com',
  'www.alphavantage.co',
  'api.polygon.io',
  'api.coingecko.com',
  'data.sec.gov',
]);

function handleGenericProxy(req, res) {
  const parsed = url.parse(req.url, true);
  const targetUrl = parsed.query && parsed.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing target url parameter' }));
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid target url' }));
  }

  if (!ALLOWED_PROXY_HOSTS.has(parsedTarget.hostname.toLowerCase())) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Host not in proxy whitelist (SSRF Guard)' }));
  }

  const options = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
    path: parsedTarget.pathname + parsedTarget.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: parsedTarget.hostname,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  };
  delete options.headers['host'];

  const client = parsedTarget.protocol === 'https:' ? https : http;
  const proxyReq = client.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    headers['access-control-allow-headers'] = '*';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/market/')) {
    return marketApi(req, res, () => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
  }

  if (req.url.startsWith('/api/proxy')) {
    return handleGenericProxy(req, res);
  }

  if (req.url.startsWith('/api/fred/')) {
    return proxyRequest(req, res, 'api.stlouisfed.org', /^\/api\/fred/);
  }

  if (req.url.startsWith('/api/yahoo/')) {
    return proxyRequest(req, res, 'query1.finance.yahoo.com', /^\/api\/yahoo/);
  }

  if (req.url.startsWith('/api/twse-www/')) {
    return proxyRequest(req, res, 'www.twse.com.tw', /^\/api\/twse-www/);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`✔ 股票紀錄 NAS 伺服器已啟動: http://0.0.0.0:${PORT}`);
  console.log(`✔ Node.js 版本: ${process.version}`);
});
