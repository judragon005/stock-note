import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { createMarketApiMiddleware } = require('./scripts/market-sync/vite-market-middleware.cjs');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vite-plugin-market-sqlite-api',
      configureServer(server) {
        server.middlewares.use(createMarketApiMiddleware());
      },
    },
  ],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    teardownTimeout: 60000,
    testTimeout: 30000,
  },
  server: {
    port: 3000,
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
            const isConnReset = err?.code === 'ECONNRESET' || String(err?.message || '').includes('ECONNRESET');
            if (isConnReset) {
              // Spec 0184 / Ticket 06: 降噪處理，以簡短警告取代紅色堆疊追蹤
              console.warn(`[Proxy Warning] Yahoo 連線暫態重置 (${err.code || 'ECONNRESET'}): ${req?.url || ''}`);
            } else {
              console.warn(`[Proxy Error] 代理轉發異常: ${err?.message || err}`);
            }
            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy Gateway Error', code: err?.code, message: err?.message }));
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

