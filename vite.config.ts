import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// 動態載入 market API 中介層（具備熱模組快取失效機制，Spec 0199 Ticket 01）
function getMarketApiMiddlewareDynamic() {
  const middlewarePath = require.resolve('./scripts/market-sync/vite-market-middleware.cjs');
  return (req: any, res: any, next: any) => {
    try {
      const { createMarketApiMiddleware } = require(middlewarePath);
      return createMarketApiMiddleware()(req, res, next);
    } catch (err: any) {
      console.warn('[Market Middleware Error]:', err?.message || err);
      return next();
    }
  };
}

// Spec 0191 / Ticket 01: 抑制外部 DNS 解析失敗 (ENOTFOUND) 與連線重置的終端機紅色堆疊追蹤刷屏
const customLogger = createLogger();
const originalLoggerError = customLogger.error;
customLogger.error = (msg, options) => {
  const isIgnorableProxyError =
    typeof msg === 'string' &&
    msg.includes('http proxy error') &&
    (msg.includes('ENOTFOUND') ||
      msg.includes('EAI_AGAIN') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ECONNREFUSED'));
  if (isIgnorableProxyError) {
    return;
  }
  originalLoggerError(msg, options);
};

// https://vitejs.dev/config/
export default defineConfig({
  customLogger,
  plugins: [
    react(),
    {
      name: 'vite-plugin-market-sqlite-api',
      configureServer(server) {
        // 監聽 scripts/market-sync/ 檔案變動，動態清理 require.cache 實現熱載入
        server.watcher.on('change', (file) => {
          if (file.includes('scripts/market-sync') || file.includes('scripts\\market-sync')) {
            for (const key of Object.keys(require.cache)) {
              if (key.includes('scripts/market-sync') || key.includes('scripts\\market-sync')) {
                delete require.cache[key];
              }
            }
          }
        });
        server.middlewares.use(getMarketApiMiddlewareDynamic());
      },
    },
  ],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    teardownTimeout: 60000,
    testTimeout: 30000,
    dangerouslyIgnoreUnhandledErrors: true,
  },
  server: {
    port: 5173,
    open: false,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Referer: 'https://finance.yahoo.com/',
          Accept: 'application/json, text/plain, */*',
        },
        configure: (proxy) => {
          proxy.on('error', (err: any, req, res) => {
            const errCode = err?.code || '';
            const errMsg = String(err?.message || '');
            const isDnsOrNetworkFailure =
              errCode === 'ENOTFOUND' ||
              errCode === 'EAI_AGAIN' ||
              errCode === 'ETIMEDOUT' ||
              errCode === 'ECONNRESET' ||
              errCode === 'ECONNREFUSED' ||
              errMsg.includes('ENOTFOUND') ||
              errMsg.includes('ECONNRESET') ||
              errMsg.includes('ETIMEDOUT');

            if (isDnsOrNetworkFailure) {
              // Spec 0191 / Ticket 01: 降噪為精簡警告，消除紅色堆疊追蹤
              console.warn(
                `[Proxy Warning] Yahoo 網路/DNS 暫態異常 (${errCode || 'NETWORK_FAILURE'}): ${req?.url || ''}`
              );
            } else {
              console.warn(`[Proxy Error] 代理轉發異常: ${errMsg || err}`);
            }

            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'Proxy Gateway Error',
                  code: errCode || 'GATEWAY_ERROR',
                  message: errMsg || 'External Gateway DNS/Network Failure',
                })
              );
            }
          });
        },
      },
      '/api/twse-www': {
        target: 'https://www.twse.com.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/twse-www/, ''),
        headers: {
          Referer: 'https://www.twse.com.tw/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
            }
          });
        },
      },
      '/api/twse': {
        target: 'https://openapi.twse.com.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/twse/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
            }
          });
        },
      },
      '/api/tpex': {
        target: 'https://www.tpex.org.tw',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tpex/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
            }
          });
        },
      },
    },
  },
  preview: {
    port: 4173,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-libs';
          }
          if (id.includes('/src/engine/')) {
            return 'app-engines';
          }
          if (id.includes('/src/components/aiForceDashboard/')) {
            return 'app-aiforce';
          }
        },
      },
    },
  },
});

