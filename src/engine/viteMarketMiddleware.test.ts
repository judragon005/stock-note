import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };
declare const setImmediate: any;

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
  function simulateRequest(
    middleware: any,
    url: string,
    options?: { method?: string; body?: any; headers?: Record<string, string> }
  ): Promise<{ status: number, headers: any, data: any }> {
    return new Promise((resolve) => {
      const { EventEmitter } = require('events');
      const req = new EventEmitter();
      req.url = url;
      req.method = options?.method || 'GET';
      req.headers = options?.headers || {};

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

      if (options?.body !== undefined) {
        setImmediate(() => {
          const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
          req.emit('data', payload);
          req.emit('end');
        });
      }
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

  it('5. isCatchupInCooldown 應準確判定 10 分鐘冷卻門檻 (Spec 0165)', () => {
    const {
      CATCHUP_COOLDOWN_MS,
      isCatchupInCooldown,
    } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    expect(CATCHUP_COOLDOWN_MS).toBe(10 * 60 * 1000);

    const now = 1000000;
    // 剛執行完 (0 秒前)：應在冷卻期內
    expect(isCatchupInCooldown(now, now)).toBe(true);
    // 執行後 5 分鐘：應在冷卻期內
    expect(isCatchupInCooldown(now - 5 * 60 * 1000, now)).toBe(true);
    // 執行後 9 分鐘 59 秒：應在冷卻期內
    expect(isCatchupInCooldown(now - (10 * 60 * 1000 - 1000), now)).toBe(true);
    // 執行後 10 分鐘整：已過冷卻期
    expect(isCatchupInCooldown(now - 10 * 60 * 1000, now)).toBe(false);
    // 執行後 15 分鐘：已過冷卻期
    expect(isCatchupInCooldown(now - 15 * 60 * 1000, now)).toBe(false);
    // 從未執行過 (lastCatchupTime = 0)：不可視為冷卻期
    expect(isCatchupInCooldown(0, now)).toBe(false);
  });

  it('6. triggerCatchupTask 應具備冷卻門檻防禦，冷卻期內應回傳 false 且不重複觸發 (Spec 0165)', () => {
    const {
      triggerCatchupTask,
      setLastCatchupTimeForTest,
      resetCatchupStateForTest,
    } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    resetCatchupStateForTest();

    // 模擬 1 分鐘前剛回補過
    setLastCatchupTimeForTest(Date.now() - 60 * 1000);

    // 在冷卻期內呼叫 triggerCatchupTask (即便 bypassTestEnv 也應被冷卻攔截)
    const triggered = triggerCatchupTask(testDbPath, { bypassTestEnv: true });
    expect(triggered).toBe(false);

    // 重設狀態模擬未執行過
    resetCatchupStateForTest();
  });

  describe('Spec 0203 Ticket 01 - POST /api/market/probe-key 本地測活代理中繼路由 (TDD)', () => {
    it('應在未提供 targetUrl 時回傳 400 錯誤與說明', async () => {
      const middleware = createMarketApiMiddleware(testDbPath);
      const res = await simulateRequest(middleware, '/api/market/probe-key', {
        method: 'POST',
        body: {},
      });

      expect(res.status).toBe(400);
      expect(res.data.error).toBe('MISSING_TARGET_URL');
      expect(res.data.message).toContain('targetUrl');
    });

    it('應能代發請求並穿透第三方之 HTTP Status 與 Response Body (成功 200)', async () => {
      const originalFetch = (globalThis as any).fetch;
      try {
        let capturedUrl = '';
        let capturedHeaders: any = {};
        (globalThis as any).fetch = async (url: any, opts: any) => {
          capturedUrl = String(url);
          capturedHeaders = opts?.headers || {};
          return {
            status: 200,
            statusText: 'OK',
            text: async () => JSON.stringify({ message: 'FRED API works' }),
          } as any;
        };

        const middleware = createMarketApiMiddleware(testDbPath);
        const res = await simulateRequest(middleware, '/api/market/probe-key', {
          method: 'POST',
          body: {
            targetUrl: 'https://api.stlouisfed.org/fred/series?series_id=DGS10',
            headers: { Accept: 'application/json' },
          },
        });

        expect(res.status).toBe(200);
        expect(res.data.ok).toBe(true);
        expect(res.data.httpStatus).toBe(200);
        expect(res.data.statusText).toBe('OK');
        expect(res.data.body).toContain('FRED API works');
        expect(res.data.latencyMs).toBeGreaterThanOrEqual(0);

        // 驗證 User-Agent 預設包含合規標頭
        expect(capturedHeaders['User-Agent'] || capturedHeaders['user-agent']).toContain('StockTracker/1.0 (local-probe)');
        expect(capturedUrl).toBe('https://api.stlouisfed.org/fred/series?series_id=DGS10');
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });

    it('應如實穿透第三方 403 Forbidden 錯誤與原始 Body，不吞噬錯誤', async () => {
      const originalFetch = (globalThis as any).fetch;
      try {
        (globalThis as any).fetch = async () => {
          return {
            status: 403,
            statusText: 'Forbidden',
            text: async () => JSON.stringify({ 'Error Message': 'Invalid API KEY.' }),
          } as any;
        };

        const middleware = createMarketApiMiddleware(testDbPath);
        const res = await simulateRequest(middleware, '/api/market/probe-key', {
          method: 'POST',
          body: {
            targetUrl: 'https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=bad_key',
          },
        });

        expect(res.status).toBe(200); // 中介層本身正常回應
        expect(res.data.ok).toBe(false);
        expect(res.data.httpStatus).toBe(403);
        expect(res.data.statusText).toBe('Forbidden');
        expect(res.data.body).toContain('Invalid API KEY.');
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });

    it('發生連線異常或網路錯誤時，應回傳 httpStatus 0 與原始例外訊息', async () => {
      const originalFetch = (globalThis as any).fetch;
      try {
        (globalThis as any).fetch = async () => {
          throw new Error('getaddrinfo ENOTFOUND api.stlouisfed.org');
        };

        const middleware = createMarketApiMiddleware(testDbPath);
        const res = await simulateRequest(middleware, '/api/market/probe-key', {
          method: 'POST',
          body: {
            targetUrl: 'https://api.stlouisfed.org/invalid',
          },
        });

        expect(res.status).toBe(200);
        expect(res.data.ok).toBe(false);
        expect(res.data.httpStatus).toBe(0);
        expect(res.data.statusText).toBe('Network Error');
        expect(res.data.error).toContain('ENOTFOUND');
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  });

  describe('Ticket 01 (Spec 0217) - 雙市場完整籌碼快照端點 (/api/market/chips-snapshot)', () => {
    it('應支援以 HAVING COUNT >= 門檻過濾殘缺日，並回傳真實價量與張數單位', async () => {
      const db = initSqliteLakehouseDb(testDbPath);
      db.prepare(
        'INSERT OR REPLACE INTO symbols_meta (symbol, name, market, type, industry, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('2330', '台積電', 'TW', 'STOCK', '半導體業', Date.now());
      db.prepare(
        'INSERT OR REPLACE INTO symbols_meta (symbol, name, market, type, industry, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('8299', '群聯', 'TW', 'STOCK', '半導體業', Date.now());

      const insertChip = db.prepare(
        'INSERT OR REPLACE INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      insertChip.run('2330', '2026-10-29', 500, 200, -50, 3000, 10);
      insertChip.run('8299', '2026-10-29', 100, 50, 10, 500, 2);

      insertChip.run('2330', '2026-10-30', 800, 300, 100, 3100, 12);
      insertChip.run('8299', '2026-10-30', -50, 80, -20, 480, 1);

      // 殘缺日：僅有 8299 一檔
      insertChip.run('8299', '2026-11-04', 20, 10, 5, 470, 0);

      const insertCandle = db.prepare(
        'INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertCandle.run('2330', '2026-10-29', 1000, 1010, 995, 1005, 1005, 25000000, 0, 15000);
      insertCandle.run('2330', '2026-10-30', 1005, 1020, 1000, 1015, 1015, 30000000, 0, 18000);

      insertCandle.run('8299', '2026-10-29', 500, 510, 495, 505, 505, 2000000, 0, 2500);
      insertCandle.run('8299', '2026-10-30', 505, 515, 500, 500, 500, 1800000, 0, 2100);

      const middleware = createMarketApiMiddleware(testDbPath);
      const res = await simulateRequest(middleware, '/api/market/chips-snapshot?market=TW&days=2&minSymbols=2');

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.availableDates).toEqual(['2026-10-30', '2026-10-29']);

      const ts2330 = res.data.items['2330'];
      expect(ts2330).toBeDefined();
      expect(ts2330.name).toBe('台積電');
      expect(ts2330.close).toBe(1015);
      expect(ts2330.volumeLots).toBe(30000);
      expect(ts2330.totalNetShares).toBe(1200);
      expect(ts2330.history).toHaveLength(2);
      expect(ts2330.history[0].date).toBe('2026-10-29');
      expect(ts2330.history[1].date).toBe('2026-10-30');
    });
    it('應支援美股快照並返回指定代號之日 K 序列', async () => {
      const db = initSqliteLakehouseDb(testDbPath);
      db.prepare(
        'INSERT OR REPLACE INTO symbols_meta (symbol, name, market, type, industry, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('AAPL', '蘋果', 'US', 'STOCK', '科技', Date.now());

      const insertCandle = db.prepare(
        'INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertCandle.run('AAPL', '2026-10-29', 220, 225, 219, 224, 224, 45000000, 0, 50000);
      insertCandle.run('AAPL', '2026-10-30', 224, 228, 223, 227, 227, 50000000, 0, 55000);

      const middleware = createMarketApiMiddleware(testDbPath);
      const res = await simulateRequest(middleware, '/api/market/chips-snapshot?market=US&symbols=AAPL');

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.items['AAPL']).toBeDefined();
      expect(res.data.items['AAPL'].close).toBe(227);
      expect(res.data.items['AAPL'].history).toHaveLength(2);
      expect(res.data.items['AAPL'].history[0].date).toBe('2026-10-29');
      expect(res.data.items['AAPL'].history[1].date).toBe('2026-10-30');
    });

    it('Ticket 03 (Spec 0218) - 湖倉快照端點應往前撈取 T-1 基準收盤價以精算首日與區間累計漲跌幅', async () => {
      const db = initSqliteLakehouseDb(testDbPath);
      db.exec('DELETE FROM tw_institutional_chips; DELETE FROM daily_candles; DELETE FROM symbols_meta;');
      db.prepare(
        'INSERT OR REPLACE INTO symbols_meta (symbol, name, market, type, industry, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('2330', '台積電', 'TW', 'STOCK', '半導體業', Date.now());

      // 插入基準日前收價 (2026-10-28)
      const insertCandle = db.prepare(
        'INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertCandle.run('2330', '2026-10-28', 990, 1005, 990, 1000, 1000, 20000000, 0, 12000);
      insertCandle.run('2330', '2026-10-29', 1000, 1010, 995, 1005, 1005, 25000000, 0, 15000);
      insertCandle.run('2330', '2026-10-30', 1005, 1020, 1000, 1020, 1020, 30000000, 0, 18000);

      const insertChip = db.prepare(
        'INSERT OR REPLACE INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      insertChip.run('2330', '2026-10-29', 500, 200, -50, 3000, 10);
      insertChip.run('2330', '2026-10-30', 800, 300, 100, 3100, 12);

      const middleware = createMarketApiMiddleware(testDbPath);
      const res = await simulateRequest(middleware, '/api/market/chips-snapshot?market=TW&days=2&minSymbols=1');

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.baseDate).toBe('2026-10-28');

      const ts2330 = res.data.items['2330'];
      expect(ts2330).toBeDefined();
      expect(ts2330.basePrice).toBe(1000);
      expect(ts2330.previousClose).toBe(1000);
      // 首日 2026-10-29: close 1005, basePrice 1000 -> 漲幅 +0.5% (不為 0)
      expect(ts2330.history[0].previousClose).toBe(1000);
      expect(ts2330.history[0].changePercent).toBe(0.5);
      // 第二日 2026-10-30: close 1020, 前日 1005 -> 漲幅 +1.49%
      expect(ts2330.history[1].previousClose).toBe(1005);
      expect(ts2330.history[1].changePercent).toBe(1.49);
      // 總累計漲跌幅: (1020 - 1000) / 1000 * 100 = +2.0%
      expect(ts2330.cumulativeChangePercent).toBe(2.0);
    });

  });
});
