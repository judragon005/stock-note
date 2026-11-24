import { describe, it, expect, afterEach } from 'vitest';
import { getMarketSettlementStatus } from './marketSettlementEngine';

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
    delete process.env.DISABLE_BUILTIN_SCHEDULER;
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
    it('Slice 1: 全量外部代理路由 (/api/fred, /api/twse-www, /api/twse, /api/tpex, /api/yahoo) 與 /api/proxy SSRF 白名單 + CORS + OPTIONS + POST body + redirect manual', async () => {
      const capturedCalls: Array<{
        url: string;
        method: string;
        headers: Record<string, string>;
        redirect?: string;
        body?: any;
      }> = [];
      const mockFetcher = async (url: string, init: any = {}) => {
        capturedCalls.push({
          url,
          method: init.method || 'GET',
          headers: init.headers || {},
          redirect: init.redirect,
          body: init.body,
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

        // 2. /api/proxy 白名單網域轉發並附帶 CORS 回應標頭，且停用自動跟隨重導向防 SSRF 繞過
        const allowedTarget = 'https://api.stlouisfed.org/fred/series?series_id=CPIAUCSL';
        const proxyOk = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent(allowedTarget)}`);
        expect(proxyOk.status).toBe(200);
        expect(proxyOk.headers.get('access-control-allow-origin')).toBe('*');
        const proxyOkBody = await proxyOk.json();
        expect(proxyOkBody.proxiedUrl).toBe(allowedTarget);
        expect(capturedCalls[capturedCalls.length - 1].redirect).toBe('manual');

        // 2b. /api/proxy POST 請求應完整轉發請求體與 Content-Type
        const postPayload = JSON.stringify({ query: '2330' });
        const proxyPost = await fetch(`${baseUrl}/api/proxy?url=${encodeURIComponent(allowedTarget)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postPayload,
        });
        expect(proxyPost.status).toBe(200);
        const lastPostCall = capturedCalls[capturedCalls.length - 1];
        expect(lastPostCall.method).toBe('POST');
        expect(lastPostCall.headers['Content-Type']).toBe('application/json');
        expect(new TextDecoder().decode(lastPostCall.body)).toBe(postPayload);

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

        // 2. 建立資料庫並放置兩個快照備份檔（含另一個無關 DB 備份），驗證僅匹配本 DB 前綴並支援 /healthz?probe=1
        initSqliteLakehouseDb(TEST_DB);
        const backupOld = path.join(TEST_DIR, 'market_history.backup-20261110.db');
        const backupNew = path.join(TEST_DIR, 'market_history.backup-20261120.db');
        const unrelatedBackup = path.join(TEST_DIR, 'other_db.backup-20261125.db');
        fs.writeFileSync(backupOld, 'old-backup');
        fs.writeFileSync(backupNew, 'new-backup-payload');
        fs.writeFileSync(unrelatedBackup, 'unrelated-should-be-ignored');

        const resReady = await fetch(`${baseUrl}/healthz?probe=1`);
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

      // 3. DISABLE_BUILTIN_SCHEDULER=true 時 /healthz 應誠實回報 scheduler.enabled === false
      process.env.DISABLE_BUILTIN_SCHEDULER = 'true';
      const disabledCtx = createNasServer({ customDbPath: TEST_DB, enableScheduler: true });
      await new Promise<void>((resolve) => disabledCtx.server.listen(0, '127.0.0.1', resolve));
      const disabledAddr = disabledCtx.server.address() as any;
      try {
        const resDisabled = await fetch(`http://127.0.0.1:${disabledAddr.port}/healthz`);
        expect(resDisabled.status).toBe(200);
        const bodyDisabled = await resDisabled.json();
        expect(bodyDisabled.scheduler.enabled).toBe(false);
      } finally {
        await disabledCtx.gracefulShutdown('SIGTERM');
      }
    });
  });

  describe('Seam 2: NAS 自治排程器每日宏觀同步與每週滾動備份保留契約', () => {
    it('Slice 4: 每日盤後視窗同時執行台美股與宏觀同步，台美股失敗時宏觀同步仍完成且同日重試不重複執行宏觀', async () => {
      let macroCalls = 0;
      const scheduler = startNasAutonomousScheduler({
        customDbPath: TEST_DB,
        runOnStart: false,
        nowFn: () => FRIDAY_AFTER_CLOSE,
        handlers: {
          checkMarketFreshness: () => STALE_DAILY,
          runDailySync: async () => {
            throw new Error('TWSE upstream 503');
          },
          runMacroSync: async () => {
            macroCalls += 1;
            return { ok: true, date: '2026-11-20' };
          },
        },
      });

      try {
        const result = await scheduler.runTickNow();
        expect(result.triggered).toBe(true);
        expect(result.tasks.daily).toMatchObject({ ok: false, error: 'TWSE upstream 503' });
        expect(result.tasks.macro).toMatchObject({ ok: true });
        expect(scheduler.getState().lastMacroIsoDate).toBe('2026-11-20');

        // 同日重試時（台美股上次失敗仍會重試），已完成的宏觀同步不應重複呼叫
        await scheduler.runTickNow();
        expect(macroCalls).toBe(1);
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

  describe('Spec 0246 Ticket 01 (Seam 1): 統一台美結算門檻、休市日曆容器打包與空表陳舊修補', () => {
    it('Slice 01-A: Dockerfile 正式 runner 階段必須複製 src/data/market-holidays.json 以免容器內休市日曆全空', () => {
      const dockerfileContent = fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf-8');
      const runnerStage = dockerfileContent.split(/FROM\s+[^\n]+AS\s+runner/i)[1] || '';
      expect(runnerStage).toMatch(/COPY\s+--from=builder\s+\/app\/src\/data\/market-holidays\.json\s+\.\/src\/data\/market-holidays\.json/);
    });

    it('Slice 01-B: 全新空資料庫（tdcc/revenue 為 null）時 checkMarketFreshness 必須判定 tdcc.isStale 與 revenue.isStale 皆為 true', () => {
      const { checkMarketFreshness } = require('../../scripts/market-sync/market-freshness-service.cjs');
      const emptyDb = {
        prepare: () => ({
          get: () => null,
          all: () => [],
        }),
      };
      const res = checkMarketFreshness(emptyDb, new Date('2026-11-24T16:00:00+08:00'));
      expect(res.tw.isStale).toBe(true);
      expect(res.us.isStale).toBe(true);
      expect(res.tdcc.latestDate).toBeNull();
      expect(res.tdcc.isStale).toBe(true);
      expect(res.revenue.latestMonth).toBeNull();
      expect(res.revenue.isStale).toBe(true);
    });

    it('Slice 01-C: 前後端結算時鐘對齊（台股 15:00 TPE、美股 17:00 NY）並一致跳過台美法定休市日', () => {
      const { getMarketAnchorDate } = require('../../scripts/market-sync/market-freshness-service.cjs');
      const { generateTradeDateCandidates } = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

      // 1. 台股法定連假：2026-04-06 (週一 清明補假) 16:00 TPE，前週五 04-03 亦休市 -> 應回退至 2026-04-02
      const twHoliday = new Date('2026-04-06T16:00:00+08:00');
      expect(getMarketAnchorDate('TW', twHoliday)).toBe('2026-04-02');
      const feTwHoliday = getMarketSettlementStatus('TW', twHoliday);
      expect(feTwHoliday.anchorTradingDate).toBe('2026-04-02');
      expect(feTwHoliday.isSettled).toBe(false);
      expect(feTwHoliday.isTradingHours).toBe(false);

      // 2. 台股 2026-09-28 (教師節) & 2026-09-25 (中秋節) -> 皆應回退至 2026-09-24
      const twTeachersDay = new Date('2026-09-28T10:00:00+08:00');
      expect(getMarketAnchorDate('TW', twTeachersDay)).toBe('2026-09-24');
      expect(getMarketSettlementStatus('TW', twTeachersDay).anchorTradingDate).toBe('2026-09-24');

      // 3. 美股感恩節 2026-11-26 18:00 EST -> 皆應回退至 2026-11-25
      const usThanksgiving = new Date('2026-11-26T18:00:00-05:00');
      expect(getMarketAnchorDate('US', usThanksgiving)).toBe('2026-11-25');
      expect(getMarketSettlementStatus('US', usThanksgiving).anchorTradingDate).toBe('2026-11-25');

      // 4. 美股統一 17:00 America/New_York 結算線（不受台北 08:00 偏移影響）
      const usBeforeSettle = new Date('2026-01-15T16:30:00-05:00');
      expect(getMarketAnchorDate('US', usBeforeSettle)).toBe('2026-01-14');
      expect(getMarketSettlementStatus('US', usBeforeSettle).anchorTradingDate).toBe('2026-01-14');
      expect(getMarketSettlementStatus('US', usBeforeSettle).isSettled).toBe(false);

      const usAfterSettle = new Date('2026-01-15T17:15:00-05:00');
      expect(getMarketAnchorDate('US', usAfterSettle)).toBe('2026-01-15');
      expect(getMarketSettlementStatus('US', usAfterSettle).anchorTradingDate).toBe('2026-01-15');
      expect(getMarketSettlementStatus('US', usAfterSettle).isSettled).toBe(true);

      // 夏令 EDT 17:15 (= 台北隔日 05:15) 亦應已結算，前後端一致
      const usEdtAfterSettle = new Date('2026-09-30T17:15:00-04:00');
      expect(getMarketAnchorDate('US', usEdtAfterSettle)).toBe('2026-09-30');
      expect(getMarketSettlementStatus('US', usEdtAfterSettle).anchorTradingDate).toBe('2026-09-30');
      expect(getMarketSettlementStatus('US', usEdtAfterSettle).isSettled).toBe(true);

      // 5. backfill-tw-history-web 候選日起點與統一 15:00 台股結算線一致
      const tw1510 = new Date('2026-10-16T15:10:00+08:00');
      expect(getMarketAnchorDate('TW', tw1510)).toBe('2026-10-16');
      expect(generateTradeDateCandidates(3, undefined, tw1510)[0]).toBe('2026-10-16');
    });
  });

  describe('Spec 0246 Ticket 02 (Seam 1): 跨模組契約修復、每週 ETF 淨值交易日定錨與美股美東 Checkpoint', () => {
    it('Slice 02-A: runWeeklyLakehouseSync 預設匯入有效 ETF 元數據函式、正確解析 { success, count } 不產生 NaN，且週六執行定錨最近台股結算日', async () => {
      const { runWeeklyLakehouseSync } = require('../../scripts/market-sync/weekly-lakehouse-sync.cjs');
      const { fetchAndIngestTwseEtfOpenApiMeta } = require('../../scripts/market-sync/ingest-tw-etf-meta.cjs');
      expect(typeof fetchAndIngestTwseEtfOpenApiMeta).toBe('function');

      let capturedNavDbPath: string | undefined;
      let capturedNavDate: string | undefined;
      // 模擬週六 2026-11-21 10:30 TPE -> 最新已結算台股交易日必為 2026-11-20 (週五)
      const saturdayNow = new Date('2026-11-21T10:30:00+08:00');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            基金代號: '0050',
            基金簡稱: '元大台灣50',
            基金類型: '國內成分證券ETF',
            '標的指數/追蹤指數名稱': '臺灣50指數',
            上市日期: '20030630',
            保管機構: '中國信託商業銀行',
          },
        ],
      })) as any;

      try {
        const report = await runWeeklyLakehouseSync({
          customDbPath: TEST_DB,
          now: saturdayNow,
          handlers: {
            runTdccIngestion: async () => ({ savedCount: 2337 }),
            runCorporateActionsIngestion: async () => 120,
            runMonthlyRevenueIngestion: async () => ({ savedCount: 1850 }),
            fetchAndIngestEtfDailyNav: async (dbPath: string, dateStr: string) => {
              capturedNavDbPath = dbPath;
              capturedNavDate = dateStr;
              return { success: true, count: 258 };
            },
            // 故意不注入 etfMeta handler，驗證模組預設匯入本身不會 TypeError
          },
        });

        expect(capturedNavDbPath).toBe(TEST_DB);
        expect(capturedNavDate).toBe('2026-11-20');
        expect(report.etfNav).toMatchObject({ ok: true, savedCount: 258, error: null });
        expect(Number.isNaN(report.etfNav.savedCount)).toBe(false);
        expect(report.etfMeta).toMatchObject({ ok: true, savedCount: 1, error: null });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('Slice 02-B: runTwMarketSync 接受設定物件 { customDbPath, now } 時不應誤繞過非交易日防護', async () => {
      const { runTwMarketSync } = require('../../scripts/market-sync/sync-tw-market.cjs');
      const saturdayNow = new Date('2026-11-21T16:00:00+08:00');
      const result = await runTwMarketSync({
        customDbPath: TEST_DB,
        now: saturdayNow,
      });
      expect(result).toMatchObject({
        ok: true,
        skipped: true,
        date: '2026-11-21',
      });
    });

    it('Slice 02-C: runUsMarketSync 同時相容 dbPath 與 customDbPath，並以美東已結算交易日寫入 sync_checkpoints（非台北日期）', async () => {
      const { runUsMarketSync } = require('../../scripts/market-sync/sync-us-market.cjs');
      // 台北時間 2026-11-24 14:00 (週二) = 美東 2026-11-24 01:00 EST -> 最新已結算美股交易日為 2026-11-23
      const taipeiTueAfternoon = new Date('2026-11-24T14:00:00+08:00');

      const res = await runUsMarketSync({
        mode: 'daily',
        dbPath: TEST_DB, // 驗證相容 dbPath 鍵名
        currentDate: taipeiTueAfternoon,
        holdings: ['AAPL'],
        customUniverse: ['AAPL'],
        maxSymbols: 1,
        baseDelayMs: 0,
        jitterMs: 0,
        writeStaticCache: false,
        skipMacroCadence: true,
        fetchQuotesFn: async () => [
          {
            date: '2026-11-23',
            open: 228,
            high: 231,
            low: 227,
            close: 230,
            adjClose: 230,
            volume: 42000000,
          },
        ],
      });

      expect(res.date).toBe('2026-11-23');
      expect(res.successCount).toBe(1);

      const { getPendingUsSymbols } = require('../../scripts/market-sync/us-sync-checkpoint-engine.cjs');
      const db = initSqliteLakehouseDb(TEST_DB);
      const cp = db
        .prepare("SELECT last_success_date, status FROM sync_checkpoints WHERE market = 'US' AND symbol = 'AAPL'")
        .get() as any;
      expect(cp).toMatchObject({
        last_success_date: '2026-11-23',
        status: 'SUCCESS',
      });
      expect(getPendingUsSymbols(['AAPL'], '2026-11-23', TEST_DB)).toEqual([]);
      expect(getPendingUsSymbols(['AAPL'], '2026-11-24', TEST_DB)).toEqual(['AAPL']);
    });
  });

  describe('Spec 0246 Tickets 03 & 04 (Seam 1): 單一湖倉調諧中樞、全域互斥鎖、30 日缺口升冪重播與台股兩階段收斂', () => {
    it('Slice 03-A: withGlobalSyncLock 防併發雙寫、暴露遙測鎖定狀態，且任務拋錯時必定釋放鎖', async () => {
      const {
        withGlobalSyncLock,
        getCoordinatorLockState,
        resetCoordinatorStateForTest,
      } = require('../../scripts/market-sync/lakehouse-sync-coordinator.cjs');

      resetCoordinatorStateForTest();
      expect(getCoordinatorLockState().locked).toBe(false);

      let releaseFirst!: () => void;
      const firstPromise = withGlobalSyncLock('nas-scheduler', async () => {
        expect(getCoordinatorLockState()).toMatchObject({ locked: true, owner: 'nas-scheduler' });
        await new Promise<void>((r) => {
          releaseFirst = r;
        });
        return 'first-done';
      });

      // 第二個併發呼叫應立即回報 skipped/LOCKED，不重複執行
      const concurrentRes = await withGlobalSyncLock('vite-catchup', async () => 'should-not-run');
      expect(concurrentRes).toMatchObject({ skipped: true, reason: 'LOCKED', lockOwner: 'nas-scheduler' });

      releaseFirst();
      const firstRes = await firstPromise;
      expect(firstRes).toMatchObject({ skipped: false, result: 'first-done' });
      expect(getCoordinatorLockState().locked).toBe(false);

      // 內部拋錯時也必須乾淨釋放鎖
      await expect(
        withGlobalSyncLock('manual-backfill', async () => {
          throw new Error('simulated failure');
        })
      ).rejects.toThrow('simulated failure');
      expect(getCoordinatorLockState().locked).toBe(false);
    });

    it('Slice 03-B: computeTwReconciliationPlan 於近 30 個日曆日同時合併完全缺失日與半殘日並升冪排序', () => {
      const { computeTwReconciliationPlan } = require('../../scripts/market-sync/lakehouse-sync-coordinator.cjs');
      const db = initSqliteLakehouseDb(TEST_DB);

      // 寫入 2026-11-19 為完整日，刻意留空 2026-11-20 與 2026-11-23（完全缺失）
      db.exec('BEGIN TRANSACTION;');
      const cStmt = db.prepare(
        'INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES (?, ?, 100, 105, 95, 100, 100, 1000)'
      );
      const chipStmt = db.prepare(
        'INSERT OR REPLACE INTO tw_institutional_chips (symbol, date, foreign_net, margin_balance, sbl_balance, day_trade_rate) VALUES (?, ?, 10, ?, ?, ?)'
      );
      const valStmt = db.prepare(
        'INSERT OR REPLACE INTO tw_valuation_daily (symbol, date, pe, pb, dividend_yield, updated_at) VALUES (?, ?, 15, 2, 3, 1)'
      );
      const navStmt = db.prepare(
        'INSERT OR REPLACE INTO etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at) VALUES (?, ?, 100, 100, 0, 1)'
      );
      cStmt.run('0050', '2026-11-19');
      cStmt.run('2330', '2026-11-19');
      for (let i = 1000; i < 3050; i++) {
        const sym = String(i);
        cStmt.run(sym, '2026-11-19');
        chipStmt.run(sym, '2026-11-19', 100, 50, 20);
        valStmt.run(sym, '2026-11-19');
      }
      for (let i = 0; i < 120; i++) {
        navStmt.run(`00${50 + i}`, '2026-11-19');
      }
      db.exec('COMMIT;');

      // 基準時間：2026-11-24 13:20 TPE (盤中 -> 最新應結算日為 2026-11-23)
      const plan = computeTwReconciliationPlan(TEST_DB, {
        now: new Date('2026-11-24T13:20:00+08:00'),
        maxLookbackDays: 5,
      });

      expect(plan.anchorDate).toBe('2026-11-23');
      expect(plan.reconcileDates).toContain('2026-11-20');
      expect(plan.reconcileDates).toContain('2026-11-23');
      expect(plan.reconcileDates).not.toContain('2026-11-19');
      // 驗證嚴格升冪（由舊至新）
      const idx20 = plan.reconcileDates.indexOf('2026-11-20');
      const idx23 = plan.reconcileDates.indexOf('2026-11-23');
      expect(idx20).toBeLessThan(idx23);
    });

    it('Slice 04-A: 盤中呼叫 reconcileTwLakehouse 應升冪補齊歷史缺失已結算交易日，絕不因當日未收盤即空跑退出', async () => {
      const {
        reconcileTwLakehouse,
        resetCoordinatorStateForTest,
      } = require('../../scripts/market-sync/lakehouse-sync-coordinator.cjs');
      resetCoordinatorStateForTest();

      const ingestedOrder: string[] = [];
      const res = await reconcileTwLakehouse({
        customDbPath: TEST_DB,
        now: new Date('2026-11-24T11:30:00+08:00'),
        maxLookbackDays: 3,
        throttleMs: 0,
        handlers: {
          fetchAndIngestTwDailyData: async (d: string) => {
            ingestedOrder.push(d);
            return {
              date: d,
              isTradingDay: true,
              quotesCount: 2300,
              chipsCount: 2200,
              marginCount: 1700,
              sblCount: 800,
              dayTradeCount: 900,
              valuationCount: 1800,
            };
          },
          fetchAndIngestEtfDailyNav: async () => ({ success: true, count: 250 }),
        },
      });

      expect(res.ok).toBe(true);
      expect(ingestedOrder).toEqual(['2026-11-19', '2026-11-20', '2026-11-23']);
      expect(res.reconciledDates).toEqual(['2026-11-19', '2026-11-20', '2026-11-23']);
    });

    it('Slice 04-B: 台股盤後兩階段收斂（14:40 Phase 1 不推進水位線；16:30 Phase 2 達完整才推進且受每日最多 4 次配額限制）', async () => {
      const {
        reconcileTwLakehouse,
        resetCoordinatorStateForTest,
      } = require('../../scripts/market-sync/lakehouse-sync-coordinator.cjs');
      resetCoordinatorStateForTest();

      // Phase 1: 15:00 TPE（價量已發布，但籌碼尚未完整）-> 寫入 Phase 1 價量與淨值，但 watermarkAdvanced = false
      const p1 = await reconcileTwLakehouse({
        customDbPath: TEST_DB,
        now: new Date('2026-11-24T15:00:00+08:00'),
        maxLookbackDays: 1,
        throttleMs: 0,
        handlers: {
          fetchAndIngestTwDailyData: async (d: string, opts: any) => ({
            date: d,
            isTradingDay: true,
            phase: opts?.allowPartialPhase1 ? 'PHASE_1_PRICE_ONLY' : 'FULL',
            partial: true,
            quotesCount: 2300,
            chipsCount: 0,
          }),
          fetchAndIngestEtfDailyNav: async () => ({ success: true, count: 250 }),
        },
      });
      expect(p1.phase).toBe('PHASE_1_PRICE_ONLY');
      expect(p1.watermarkAdvanced).toBe(false);

      // Phase 2: 16:45 TPE，模擬上游持續半殘 -> 最多重試 4 次，第 5 次被配額攔截 (budgetExhausted: true)
      resetCoordinatorStateForTest();
      let phase2Calls = 0;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const res = await reconcileTwLakehouse({
          customDbPath: TEST_DB,
          now: new Date('2026-11-24T16:45:00+08:00'),
          maxLookbackDays: 1,
          throttleMs: 0,
          retryCooldownMs: 0,
          handlers: {
            fetchAndIngestTwDailyData: async (d: string) => {
              phase2Calls += 1;
              return { date: d, isTradingDay: true, hasError: true, errorReason: 'T86_DELAYED', quotesCount: 2300, chipsCount: 100 };
            },
            fetchAndIngestEtfDailyNav: async () => ({ success: true, count: 250 }),
          },
        });
        if (attempt <= 4) {
          expect(res.watermarkAdvanced).toBe(false);
          expect(res.budgetExhausted).toBe(false);
        } else {
          expect(res.skipped).toBe(true);
          expect(res.budgetExhausted).toBe(true);
        }
      }
      expect(phase2Calls).toBe(4);
    });

    it('Slice 04-C: 台股日更 (parseTpexDailyQuotesBulk) 與歷史回補 (parseTpexDailyQuotesWithTransactions) 一致濾除 6 碼 7 開頭櫃買權證', () => {
      const { parseTpexDailyQuotesBulk } = require('../../scripts/market-sync/market-sync-core.cjs');
      const { parseTpexDailyQuotesWithTransactions } = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

      const mockTpex = {
        tables: [
          {
            data: [
              ['3293', '鈊象', '1050.00', '+10.00', '1040.00', '1060.00', '1035.00', '4512', '1234567', '1296000000'],
              ['700123', '元大權證', '1.25', '+0.05', '1.20', '1.28', '1.20', '120', '50000', '62500'],
              ['739888', '凱基權證', '0.88', '-0.02', '0.90', '0.90', '0.85', '80', '30000', '25500'],
              ['00679B', '元大美債20年', '30.50', '+0.10', '30.40', '30.55', '30.35', '9000', '5000000', '152500000'],
              ['15601', '中砂一', '120.00', '+1.50', '118.50', '121.00', '118.50', '50', '10000', '1200000'],
            ],
          },
        ],
      };

      const dailyParsed = parseTpexDailyQuotesBulk(mockTpex, '2026-11-23');
      const backfillParsed = parseTpexDailyQuotesWithTransactions(mockTpex, '2026-11-23');

      expect(Object.keys(dailyParsed).sort()).toEqual(['00679B', '15601', '3293']);
      expect(Object.keys(backfillParsed).sort()).toEqual(['00679B', '15601', '3293']);
    });
  });

  describe('Spec 0246 Ticket 05 (Seam 1): NAS 四軌獨立水位線狀態機與 /healthz 遙測擴充', () => {
    it('Slice 05-A: 週二清晨美股同步完成絕不鎖死午後台股同步；台股 15:00 Phase 1 未推進水位線且 16:45 Phase 2 正常推進', async () => {
      const { resetCoordinatorStateForTest } = require('../../scripts/market-sync/lakehouse-sync-coordinator.cjs');
      resetCoordinatorStateForTest();

      let currentNow = new Date('2026-11-24T06:15:00+08:00'); // 週二清晨 06:15 TPE
      let twCalls = 0;
      let usCalls = 0;
      let freshnessState: any = {
        tw: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
        us: { latestDate: '2026-11-20', anchorDate: '2026-11-23', isStale: true },
        tdcc: { latestDate: '2026-11-20', anchorDate: '2026-11-20', isStale: false },
        revenue: { latestMonth: '2026-10', anchorMonth: '2026-10', isStale: false },
      };

      const scheduler = startNasAutonomousScheduler({
        customDbPath: TEST_DB,
        runOnStart: false,
        nowFn: () => currentNow,
        handlers: {
          checkMarketFreshness: () => freshnessState,
          runTwDailySync: async () => {
            twCalls += 1;
            const hour = currentNow.getUTCHours() + 8;
            if (hour < 16) {
              return { ok: true, phase: 'PHASE_1_PRICE_ONLY', watermarkAdvanced: false, watermarkDate: null };
            }
            freshnessState = {
              ...freshnessState,
              tw: { latestDate: '2026-11-24', anchorDate: '2026-11-24', isStale: false },
            };
            return { ok: true, phase: 'PHASE_2_FULL', watermarkAdvanced: true, watermarkDate: '2026-11-24' };
          },
          runUsDailySync: async () => {
            usCalls += 1;
            freshnessState = {
              ...freshnessState,
              us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
            };
            return { ok: true, date: '2026-11-23', successCount: 1400 };
          },
          runMacroSync: async () => ({ ok: true, date: '2026-11-24' }),
        },
      });

      try {
        // 1. 清晨 06:15：僅美股過期 -> 只跑 usDaily（絕不誤跑 twDaily，也不鎖死午後 twDaily）
        const morningTick = await scheduler.runTickNow();
        expect(morningTick.triggered).toBe(true);
        expect(usCalls).toBe(1);
        expect(twCalls).toBe(0);
        expect(scheduler.getState().lanes.usDaily.watermarkDate).toBe('2026-11-23');
        expect(scheduler.getState().lanes.twDaily.watermarkDate).toBeNull();

        // 2. 午後 15:00：台股已過 15:00 結算線（Phase 1）-> twDaily 正常觸發，但 watermarkAdvanced = false
        currentNow = new Date('2026-11-24T15:00:00+08:00');
        freshnessState = {
          ...freshnessState,
          tw: { latestDate: '2026-11-23', anchorDate: '2026-11-24', isStale: true },
        };
        const phase1Tick = await scheduler.runTickNow();
        expect(phase1Tick.triggered).toBe(true);
        expect(twCalls).toBe(1);
        expect(usCalls).toBe(1); // 美股不重複跑
        expect(scheduler.getState().lanes.twDaily.watermarkDate).toBeNull();

        // 3. 盤後 16:45：Phase 2 籌碼齊備 -> twDaily 再次觸發並推進水位線至 2026-11-24
        currentNow = new Date('2026-11-24T16:45:00+08:00');
        const phase2Tick = await scheduler.runTickNow();
        expect(phase2Tick.triggered).toBe(true);
        expect(twCalls).toBe(2);
        expect(scheduler.getState().lanes.twDaily.watermarkDate).toBe('2026-11-24');
      } finally {
        scheduler.stop();
      }
    });

    it('Slice 05-B: /healthz 應暴露四軌水位線遙測 (lanes.twDaily/usDaily/macro/weekly) 與協調中樞狀態', async () => {
      initSqliteLakehouseDb(TEST_DB);
      const { server, gracefulShutdown } = createNasServer({
        customDbPath: TEST_DB,
        enableScheduler: true,
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as any;

      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/healthz`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.scheduler.enabled).toBe(true);
        expect(body.scheduler.lanes).toBeDefined();
        expect(Object.keys(body.scheduler.lanes).sort()).toEqual(['macro', 'twDaily', 'usDaily', 'weekly']);
        expect(body.coordinator).toBeDefined();
        expect(body.coordinator.lock).toMatchObject({ locked: false });
        expect(body.coordinator.twGapSummary).toBeDefined();
      } finally {
        await gracefulShutdown('SIGTERM');
      }
    });
  });

  describe('Spec 0246 Ticket 09 (Seam 1): NAS 靜態伺服器 JSON 快取標頭去不可變鎖死契約', () => {
    it('Slice 09-A: .json 資源必須回傳 Cache-Control: no-cache（絕不回傳 immutable），雜湊 .js 仍保留 immutable', async () => {
      const fakeDist = path.join(TEST_DIR, 'dist-cache-test');
      fs.mkdirSync(fakeDist, { recursive: true });
      fs.writeFileSync(path.join(fakeDist, 'index.html'), '<html></html>');
      fs.writeFileSync(path.join(fakeDist, 'manifest.json'), JSON.stringify({ ok: true }));
      fs.writeFileSync(path.join(fakeDist, 'app.abc123.js'), 'console.log(1);');

      const { server, gracefulShutdown } = createNasServer({
        distDir: fakeDist,
        customDbPath: TEST_DB,
        enableScheduler: false,
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as any;

      try {
        const jsonRes = await fetch(`http://127.0.0.1:${addr.port}/manifest.json`);
        expect(jsonRes.status).toBe(200);
        const jsonCache = jsonRes.headers.get('cache-control') || '';
        expect(jsonCache).toContain('no-cache');
        expect(jsonCache).not.toContain('immutable');

        const jsRes = await fetch(`http://127.0.0.1:${addr.port}/app.abc123.js`);
        expect(jsRes.status).toBe(200);
        expect(jsRes.headers.get('cache-control')).toContain('immutable');
      } finally {
        await gracefulShutdown('SIGTERM');
      }
    });
  });

  describe('Spec 0246 Ticket 12 (Seam 1): 歷史補抓日 TWSE 覆蓋底線與 2026 實戰休市日防無限陳舊迴圈', () => {
    it('Slice 12-A: 歷史補抓日 (< twLatest) 具 TWSE 全量資券/估值 (>= 900) 應收斂非陳舊；twLatest 仍須滿足 1500 門檻，且 2026 颱風/光復/行憲休市日免報假缺口', () => {
      const { isTradingDay } = require('../../scripts/market-sync/trading-calendar-engine.cjs');
      const { checkMarketFreshness } = require('../../scripts/market-sync/market-freshness-service.cjs');

      // 2026 實戰驗證之颱風停市與法定補假／國定假日
      expect(isTradingDay('2026-10-23', 'TW')).toBe(false);
      expect(isTradingDay('2026-10-26', 'TW')).toBe(false);
      expect(isTradingDay('2026-12-25', 'TW')).toBe(false);

      const dbPath = path.join(TEST_DIR, 'hist-threshold.db');
      const db = initSqliteLakehouseDb(dbPath);
      db.exec('BEGIN TRANSACTION;');
      const cStmt = db.prepare(
        'INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES (?, ?, 100, 105, 95, 100, 100, 1000)'
      );
      const chipStmt = db.prepare(
        'INSERT OR REPLACE INTO tw_institutional_chips (symbol, date, foreign_net, margin_balance, sbl_balance, day_trade_rate) VALUES (?, ?, 10, ?, ?, ?)'
      );
      const valStmt = db.prepare(
        'INSERT OR REPLACE INTO tw_valuation_daily (symbol, date, pe, pb, dividend_yield, updated_at) VALUES (?, ?, 15, 2, 3, 1)'
      );
      const navStmt = db.prepare(
        'INSERT OR REPLACE INTO etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at) VALUES (?, ?, 180, 180, 0, 1)'
      );

      // 歷史日 2026-11-20：TWSE-only 補抓量 (margin=1200, val=1050, sbl=1000, dt=1000)
      cStmt.run('2330', '2026-11-20');
      cStmt.run('0050', '2026-11-20');
      for (let i = 1000; i < 3100; i++) {
        const sym = String(i);
        chipStmt.run(sym, '2026-11-20', i < 2200 ? 100 : null, i < 2000 ? 50 : null, i < 2000 ? 20 : null);
        if (i < 2050) valStmt.run(sym, '2026-11-20');
      }

      // 最新日 2026-11-23：TWSE+TPEx 完整覆蓋 (margin=1600, val=1600, sbl=1000, dt=1000, nav=120)
      cStmt.run('2330', '2026-11-23');
      cStmt.run('0050', '2026-11-23');
      for (let i = 1000; i < 3100; i++) {
        const sym = String(i);
        chipStmt.run(sym, '2026-11-23', i < 2600 ? 100 : null, i < 2000 ? 50 : null, i < 2000 ? 20 : null);
        if (i < 2600) valStmt.run(sym, '2026-11-23');
      }
      for (let i = 0; i < 120; i++) {
        navStmt.run(`00${50 + i}`, '2026-11-23');
      }
      db.exec('COMMIT;');

      const now = new Date('2026-11-24T10:00:00+08:00');
      const healthy = checkMarketFreshness(db, now);
      expect(healthy.tw.latestDate).toBe('2026-11-23');
      expect(healthy.tw.isStale).toBe(false);
      expect(healthy.tw.incompleteDates).toEqual([]);

      // 若歷史日 2026-11-20 資券真的缺失 (< 900)，仍應精準抓出為半殘日
      db.prepare("UPDATE tw_institutional_chips SET margin_balance = NULL WHERE date = '2026-11-20'").run();
      const brokenHist = checkMarketFreshness(db, now);
      expect(brokenHist.tw.isStale).toBe(true);
      expect(brokenHist.tw.incompleteDates).toContain('2026-11-20');
      expect(brokenHist.tw.missingPlanes).toContain('margin');
    });
  });
});
