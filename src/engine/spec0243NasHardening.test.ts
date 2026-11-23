import { describe, it, expect, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

const fs = require('fs');
const path = require('path');

const { initSqliteLakehouseDb, closeSqliteDb, checkpointSqliteWal } = require('../../scripts/market-sync/sqlite-db-core.cjs');
const { createNasServer, getDbHealthMetrics } = require('../../scripts/nas-server.cjs');
const {
  startNasAutonomousScheduler,
  createRollingBackup,
} = require('../../scripts/market-sync/nas-autonomous-scheduler.cjs');

// 2026-11-20T08:00:00Z = 台北時間 2026-11-20 (週五) 16:00，盤後視窗
const FRIDAY_AFTER_CLOSE = new Date('2026-11-20T08:00:00Z');
const STALE_DAILY = { tw: { isStale: true }, us: { isStale: true }, tdcc: { isStale: false }, revenue: { isStale: false } };

const TEST_DIR = path.resolve(process.cwd(), '.scratch/test-market-cache/spec0243');
const TEST_DB = path.join(TEST_DIR, 'market_history.db');

describe('Spec 0243: NAS 生產伺服器 SSOT 收斂、WAL 優雅關機與自治排程強化', () => {
  afterEach(() => {
    delete process.env.LAKEHOUSE_DB_PATH;
    try {
      closeSqliteDb();
    } catch {
      // ignore
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Seam 1: NAS 生產伺服器全路由代理契約、SSRF 防護、/healthz 與優雅關機', () => {
    it('Slice 1: 全量外部代理路由 (/api/fred, /api/twse-www, /api/twse, /api/tpex, /api/yahoo) 與 /api/proxy SSRF 白名單 + CORS + OPTIONS', async () => {
      const capturedCalls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
      const mockFetcher = async (url: string, init: any = {}) => {
        capturedCalls.push({
          url,
          method: init.method || 'GET',
          headers: init.headers || {},
        });
        return {
          status: 200,
          headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
          arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ proxiedUrl: url })).buffer,
        };
      };

      const { server } = createNasServer({
        customDbPath: TEST_DB,
        enableScheduler: false,
        upstreamFetcher: mockFetcher,
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as any;
      const baseUrl = `http://127.0.0.1:${addr.port}`;

      try {
        // 1. 驗證 5 條固定前綴代理路由皆正確轉發至對應官方上游
        const routeExpectations = [
          { reqPath: '/api/fred/fred/series/observations?series_id=DGS10', expectedUrl: 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS10' },
          { reqPath: '/api/twse-www/rwd/zh/afterTrading/STOCK_DAY?stockNo=2330', expectedUrl: 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=2330' },
          { reqPath: '/api/twse/v1/exchangeReport/STOCK_DAY_ALL', expectedUrl: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL' },
          { reqPath: '/api/tpex/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php', expectedUrl: 'https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php' },
          { reqPath: '/api/yahoo/v8/finance/chart/2330.TW', expectedUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/2330.TW' },
        ];

        for (const { reqPath, expectedUrl } of routeExpectations) {
          const res = await fetch(`${baseUrl}${reqPath}`);
          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.proxiedUrl).toBe(expectedUrl);
        }

        // 2. /api/proxy 白名單網域轉發並附帶 CORS 回應標頭
        const allowedTarget = 'https://api.stlouisfed.org/fred/series?series_id=CPIAUCSL';
        const proxyOk = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent(allowedTarget)}`);
        expect(proxyOk.status).toBe(200);
        expect(proxyOk.headers.get('access-control-allow-origin')).toBe('*');
        const proxyOkBody = await proxyOk.json();
        expect(proxyOkBody.proxiedUrl).toBe(allowedTarget);

        // 3. /api/proxy 支援 OPTIONS 預檢請求
        const preflight = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent(allowedTarget)}`, {
          method: 'OPTIONS',
        });
        expect(preflight.status).toBe(204);
        expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
        expect(preflight.headers.get('access-control-allow-methods')).toContain('OPTIONS');

        // 4. /api/proxy SSRF Guard：拒絕內網 IP 與非白名單網域，且不觸發上游請求
        const callsBeforeSsrf = capturedCalls.length;
        const ssrfLocal = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent('http://127.0.0.1:8080/admin')}`);
        expect(ssrfLocal.status).toBe(403);

        const ssrfMeta = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data/')}`);
        expect(ssrfMeta.status).toBe(403);

        const ssrfUnknown = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent('https://evil.example.com/steal')}`);
        expect(ssrfUnknown.status).toBe(403);
        expect(capturedCalls.length).toBe(callsBeforeSsrf);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('Slice 2: gracefulShutdown 防重入並依序停止排程器、關閉 HTTP、執行 WAL Checkpoint 與關閉 SQLite', async () => {
      // 先建立資料庫並寫入一筆資料以確保產生 WAL 頁
      const db = initSqliteLakehouseDb(TEST_DB);
      db.prepare(
        `INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run('2330', '台積電', 'TW', 'TWSE', 'STOCK', 'NORMAL', Date.now());

      expect(typeof checkpointSqliteWal).toBe('function');

      const { server, gracefulShutdown } = createNasServer({
        customDbPath: TEST_DB,
        enableScheduler: true,
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

      expect(typeof gracefulShutdown).toBe('function');

      // 同時觸發兩次驗證防重入
      const [r1, r2] = await Promise.all([gracefulShutdown('SIGTERM'), gracefulShutdown('SIGINT')]);
      expect(r1.ok).toBe(true);
      expect(r1.walCheckpointed).toBe(true);
      expect(r1.checkpoint).toMatchObject({ ok: true, skipped: false });
      expect(r2.reentrant || r2.ok).toBe(true);

      // HTTP 伺服器應已關閉
      expect(server.listening).toBe(false);

      // 重新開啟資料庫驗證寫入資料 100% 落盤保留
      const reopened = initSqliteLakehouseDb(TEST_DB);
      const row = reopened.prepare('SELECT name FROM symbols_meta WHERE symbol = ?').get('2330') as any;
      expect(row?.name).toBe('台積電');
    });

    it('Slice 3: /healthz 在資料庫未建立時誠實回報 dbSizeBytes=0 與 latestBackup=null，建立後回報實際大小與最新備份資訊', async () => {
      // 0. 嚴格驗證資料庫檔案尚未建立（目錄不存在）時不拋錯且 dbSizeBytes === 0
      const nonExistentDb = path.join(TEST_DIR, 'non-existent-sub', 'missing.db');
      expect(getDbHealthMetrics(nonExistentDb)).toEqual({
        dbSizeBytes: 0,
        latestBackup: null,
      });

      const { server, gracefulShutdown } = createNasServer({
        customDbPath: TEST_DB,
        enableScheduler: false,
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as any;
      const baseUrl = `http://127.0.0.1:${addr.port}`;

      try {
        // 1. 無備份時 latestBackup 為 null，dbSizeBytes 與檔案系統實際大小一致
        const resEmpty = await fetch(`${baseUrl}/healthz`);
        expect(resEmpty.status).toBe(200);
        const bodyEmpty = await resEmpty.json();
        const actualSize = fs.existsSync(TEST_DB) ? fs.statSync(TEST_DB).size : 0;
        expect(bodyEmpty).toMatchObject({
          status: 'ok',
          dbPath: TEST_DB,
          dbSizeBytes: actualSize,
          scheduler: { enabled: false },
          latestBackup: null,
        });

        // 2. 建立資料庫並放置兩個快照備份檔，驗證回報實際位元組數與最新備份檔
        initSqliteLakehouseDb(TEST_DB);
        const backupOld = path.join(TEST_DIR, 'market_history.backup-20261110.db');
        const backupNew = path.join(TEST_DIR, 'market_history.backup-20261120.db');
        fs.writeFileSync(backupOld, 'old-backup');
        fs.writeFileSync(backupNew, 'new-backup-payload');

        const resReady = await fetch(`${baseUrl}/healthz`);
        expect(resReady.status).toBe(200);
        const bodyReady = await resReady.json();
        expect(bodyReady.dbSizeBytes).toBeGreaterThan(0);
        expect(bodyReady.latestBackup).toMatchObject({
          fileName: 'market_history.backup-20261120.db',
          sizeBytes: new TextEncoder().encode('new-backup-payload').byteLength,
        });
      } finally {
        await gracefulShutdown('SIGTERM');
      }
    });
  });

  describe('Seam 2: NAS 自治排程器每日宏觀同步與每週滾動備份保留契約', () => {
    it('Slice 4: 每日盤後視窗同時執行台美股與宏觀同步，台美股失敗時宏觀同步仍完成 (錯誤隔離)', async () => {
      const scheduler = startNasAutonomousScheduler({
        customDbPath: TEST_DB,
        runOnStart: false,
        nowFn: () => FRIDAY_AFTER_CLOSE,
        handlers: {
          checkMarketFreshness: () => STALE_DAILY,
          runDailySync: async () => {
            throw new Error('TWSE upstream 503');
          },
          runMacroSync: async () => ({ ok: true, date: '2026-11-20' }),
        },
      });

      try {
        const result = await scheduler.runTickNow();
        expect(result.triggered).toBe(true);
        expect(result.tasks.daily).toMatchObject({ ok: false, error: 'TWSE upstream 503' });
        expect(result.tasks.macro).toMatchObject({ ok: true });
        expect(scheduler.getState().lastMacroIsoDate).toBe('2026-11-20');
      } finally {
        scheduler.stop();
      }
    });

    it('Slice 5: 連續 4 個不同日期建立滾動快照後，目錄內精確只保留最新 2 份有效備份，且主資料庫仍可讀寫', () => {
      const db = initSqliteLakehouseDb(TEST_DB);
      db.prepare(
        `INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run('0050', '元大台灣50', 'TW', 'TWSE', 'ETF', 'NORMAL', Date.now());

      const snapshotDates = ['2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21'];
      let lastResult: any = null;
      for (const iso of snapshotDates) {
        // 台北時間當日 10:30 (UTC 02:30)
        lastResult = createRollingBackup({ dbPath: TEST_DB, now: new Date(`${iso}T02:30:00Z`), keep: 2 });
      }

      expect(lastResult).toMatchObject({ ok: true, fileName: 'market_history.backup-20261121.db' });

      const remaining = fs
        .readdirSync(TEST_DIR)
        .filter((name: string) => name.startsWith('market_history.backup-'))
        .sort();
      expect(remaining).toEqual(['market_history.backup-20261114.db', 'market_history.backup-20261121.db']);

      // 備份檔為有效 SQLite 且包含快照資料
      const { DatabaseSync } = require('node:sqlite');
      const backupDb = new DatabaseSync(path.join(TEST_DIR, 'market_history.backup-20261121.db'), { readOnly: true });
      try {
        const row = backupDb.prepare('SELECT name FROM symbols_meta WHERE symbol = ?').get('0050') as any;
        expect(row?.name).toBe('元大台灣50');
      } finally {
        backupDb.close();
      }

      // 主資料庫仍可正常寫入讀取
      const live = initSqliteLakehouseDb(TEST_DB);
      live.prepare('UPDATE symbols_meta SET name = ? WHERE symbol = ?').run('元大台灣50 ETF', '0050');
      const liveRow = live.prepare('SELECT name FROM symbols_meta WHERE symbol = ?').get('0050') as any;
      expect(liveRow?.name).toBe('元大台灣50 ETF');
    });

    it('Slice 6: 每週同步成功後自動產出滾動快照並記錄於排程器狀態；每週同步失敗時不產生備份', async () => {
      // 2026-11-21T02:30:00Z = 台北時間 2026-11-21 (週六) 10:30
      const saturday = new Date('2026-11-21T02:30:00Z');
      const fresh = { tw: { isStale: false }, us: { isStale: false }, tdcc: { isStale: false }, revenue: { isStale: false } };
      const listBackups = () =>
        fs.existsSync(TEST_DIR)
          ? fs.readdirSync(TEST_DIR).filter((n: string) => n.startsWith('market_history.backup-'))
          : [];

      const failing = startNasAutonomousScheduler({
        customDbPath: TEST_DB,
        runOnStart: false,
        nowFn: () => saturday,
        handlers: {
          checkMarketFreshness: () => fresh,
          runWeeklyLakehouseSync: async () => {
            throw new Error('TDCC timeout');
          },
        },
      });
      try {
        const failResult = await failing.runTickNow();
        expect(failResult.tasks.weekly).toMatchObject({ ok: false, error: 'TDCC timeout' });
        expect(failResult.tasks.backup).toBeUndefined();
        expect(listBackups()).toEqual([]);
      } finally {
        failing.stop();
      }

      const succeeding = startNasAutonomousScheduler({
        customDbPath: TEST_DB,
        runOnStart: false,
        nowFn: () => saturday,
        handlers: {
          checkMarketFreshness: () => fresh,
          runWeeklyLakehouseSync: async () => ({ ok: true }),
        },
      });
      try {
        const okResult = await succeeding.runTickNow();
        expect(okResult.tasks.weekly).toMatchObject({ ok: true });
        expect(okResult.tasks.backup).toMatchObject({ ok: true, fileName: 'market_history.backup-20261121.db' });
        expect(listBackups()).toEqual(['market_history.backup-20261121.db']);
        expect(succeeding.getState().latestBackup).toMatchObject({ fileName: 'market_history.backup-20261121.db' });
      } finally {
        succeeding.stop();
      }
    });
  });
});
