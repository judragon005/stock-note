import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  createMarketApiMiddleware,
} = require('../../scripts/market-sync/vite-market-middleware.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 10 - Vite 原生 Connect 中介層 API (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_vite_api.db');

  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}

  afterAll(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (e) {}
  });

  // 輔助函式：模擬 HTTP 請求與回應
  function simulateRequest(middleware: any, url: string): Promise<{ status: number, headers: any, data: any }> {
    return new Promise((resolve) => {
      const req = { url, method: 'GET' };
      let statusCode = 200;
      let headers: any = {};
      let body = '';

      const res = {
        writeHead(code: number, h: any) {
          statusCode = code;
          headers = h || {};
          return this;
        },
        setHeader(k: string, v: string) {
          headers[k] = v;
        },
        end(chunk: string) {
          body = chunk || '';
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({ status: statusCode, headers, data: parsed });
        },
      };

      const next = () => {
        resolve({ status: 404, headers: {}, data: { error: 'PASSTHROUGH_NEXT' } });
      };

      middleware(req, res, next);
    });
  }

  it('1. GET /api/market/symbols 應能根據關鍵字回傳標的搜尋清單', async () => {
    initSqliteLakehouseDb(testDbPath);
    const db = getSqliteDbConnection(testDbPath);
    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('2330', '台積電', 'TW', 'TWSE', 'STOCK', 'NORMAL', Date.now());

    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/symbols?q=台積');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].symbol).toBe('2330');
  });

  it('2. GET /api/market/history/:symbol 應能回傳 250 天以內的日 K 與籌碼', async () => {
    const db = getSqliteDbConnection(testDbPath);
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2330', '2026-09-30', 980.0, 995.0, 978.0, 990.0, 990.0, 35000, 34500000000);

    db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, sbl_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('2330', '2026-09-30', 5000, 1500, -500, 100000);

    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/history/2330?limit=250');

    expect(res.status).toBe(200);
    expect(res.data.symbol).toBe('2330');
    expect(Array.isArray(res.data.candles)).toBe(true);
    expect(res.data.candles).toHaveLength(1);
    expect(res.data.candles[0].close).toBe(990.0);
    expect(res.data.chips['2026-09-30'].foreign_net).toBe(5000);
  });

  it('3. GET /api/market/sync-status 應能回傳各市場最新日期與陳舊度判定 (Spec 0160)', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/sync-status');

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('tw');
    expect(res.data).toHaveProperty('us');
    expect(res.data.tw).toHaveProperty('latestDate');
    expect(res.data.tw).toHaveProperty('anchorDate');
    expect(res.data.tw).toHaveProperty('isStale');
    expect(res.data).toHaveProperty('isCatchingUp');
  });

  it('4. 非 /api/market 路由應直接調用 next() 放行至 Vite 靜態資源處理', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/src/main.tsx');
    expect(res.data.error).toBe('PASSTHROUGH_NEXT');
  });
});
