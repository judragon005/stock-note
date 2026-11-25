import { describe, it, expect, afterEach, vi } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string; env: Record<string, string | undefined> };
declare const Buffer: any;

const http = require('node:http');
const path = require('path');
const fs = require('fs');

const TEST_DIR = path.resolve(process.cwd(), '.scratch/test-market-cache/spec0247');
const TEST_DB = path.join(TEST_DIR, 'market_history.db');

describe('Spec 0247 (Wave 0): 系統免疫強化 — 資安邊界、鎖內逾時、快照脫敏與隱私淨化', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    try {
      const { closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      closeSqliteDb();
    } catch {}
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Track A (T01–T03): Unified SSRF Origin Guard, probe-key closure & NAS proxy guardrails', () => {
    it('T01: validateOutboundTargetUrl 嚴格封鎖非 HTTPS、私網/Loopback/Metadata、憑證嵌入與非白名單主機，並放行全數合法金融供應商', () => {
      const {
        ALLOWED_OUTBOUND_HOSTS,
        validateOutboundTargetUrl,
        isRedirectResponseStatus,
      } = require('../../scripts/market-sync/ssrf-origin-guard.cjs');

      // 合法 9 大金融供應商 HTTPS 網址皆應通過
      const validUrls = [
        'https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo',
        'https://finnhub.io/api/v1/stock/profile2?symbol=AAPL',
        'https://api.stlouisfed.org/fred/series?series_id=DGS10',
        'https://financialmodelingprep.com/api/v3/profile/AAPL',
        'https://www.alphavantage.co/query?function=GLOBAL_QUOTE',
        'https://api.coingecko.com/api/v3/ping',
        'https://api.polygon.io/v1/meta/symbols/AAPL/company',
        'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        'https://api.tiingo.com/tiingo/daily/aapl/prices',
      ];
      expect(ALLOWED_OUTBOUND_HOSTS.size).toBeGreaterThanOrEqual(9);
      for (const u of validUrls) {
        const res = validateOutboundTargetUrl(u);
        expect(res.ok, `Expected valid URL to pass: ${u}`).toBe(true);
      }

      // 協定阻斷 (http, file, ftp, javascript, 畸形)
      expect(validateOutboundTargetUrl('http://api.stlouisfed.org/fred/series').ok).toBe(false);
      expect(validateOutboundTargetUrl('http://api.stlouisfed.org/fred/series').code).toBe('UNSUPPORTED_PROTOCOL');
      expect(validateOutboundTargetUrl('file:///etc/passwd').code).toBe('UNSUPPORTED_PROTOCOL');
      expect(validateOutboundTargetUrl('not-a-url').code).toBe('INVALID_URL');

      // 私網 / Loopback / Cloud Metadata / IPv6 阻斷
      const privateTargets = [
        'https://localhost/admin',
        'https://127.0.0.1:8080/health',
        'https://10.0.0.1/internal',
        'https://172.16.0.12/internal',
        'https://192.168.1.1/router',
        'https://169.254.169.254/latest/meta-data/',
        'https://[::1]/admin',
        'https://0.0.0.0:3000/healthz',
      ];
      for (const u of privateTargets) {
        const res = validateOutboundTargetUrl(u);
        expect(res.ok, `Expected private target blocked: ${u}`).toBe(false);
        expect(res.code).toBe('PRIVATE_HOST_BLOCKED');
      }

      // 憑證嵌入 (userinfo) 與非白名單主機阻斷
      expect(validateOutboundTargetUrl('https://user:pass@api.stlouisfed.org/').ok).toBe(false);
      expect(validateOutboundTargetUrl('https://evil.example.com/steal').code).toBe('HOST_NOT_ALLOWED');
      expect(validateOutboundTargetUrl('https://api.stlouisfed.org.evil.com/').code).toBe('HOST_NOT_ALLOWED');

      // 重導向狀態識別
      expect(isRedirectResponseStatus(301)).toBe(true);
      expect(isRedirectResponseStatus(302)).toBe(true);
      expect(isRedirectResponseStatus(307)).toBe(true);
      expect(isRedirectResponseStatus(308)).toBe(true);
      expect(isRedirectResponseStatus(200)).toBe(false);
    });

    it('T02: POST /api/market/probe-key 強制套用 SSRF 白名單與禁自動重導向，阻斷私網、非 HTTPS 與 3xx Open Redirect', async () => {
      const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
        if (String(url).includes('redirect-trap')) {
          return new Response('', { status: 302, headers: { location: 'http://127.0.0.1:8080/secret' } });
        }
        return new Response(JSON.stringify({ ok: true, redirectMode: init?.redirect }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const mw = createMarketApiMiddleware();
      const server = http.createServer((req: any, res: any) => {
        mw(req, res, () => {
          res.writeHead(404);
          res.end('NOT_FOUND');
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = (server.address() as any).port;

      const postProbe = (payload: any) =>
        new Promise<{ status: number; body: any }>((resolve, reject) => {
          const data = JSON.stringify(payload);
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: '/api/market/probe-key',
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            },
            (res: any) => {
              const chunks: any[] = [];
              res.on('data', (c: any) => chunks.push(c));
              res.on('end', () => {
                resolve({
                  status: res.statusCode || 0,
                  body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
                });
              });
            }
          );
          req.on('error', reject);
          req.write(data);
          req.end();
        });

      try {
        // 1. 內網與 Metadata 與非白名單全部攔截 403，且絕不呼叫底層 fetch
        for (const badUrl of [
          'http://127.0.0.1:8080/admin',
          'http://169.254.169.254/latest/meta-data/',
          'https://192.168.1.10/api',
          'https://evil.example.com/exfil',
          'http://api.finmindtrade.com/api/v4/data',
        ]) {
          const r = await postProbe({ targetUrl: badUrl });
          expect(r.status).toBe(403);
          expect(r.body.error).toContain('SSRF');
        }
        expect(fetchSpy).not.toHaveBeenCalled();

        // 2. 合法白名單供應商允許通過且強制 redirect: 'manual'
        const okRes = await postProbe({ targetUrl: 'https://api.tiingo.com/tiingo/daily/aapl/prices?token=demo' });
        expect(okRes.status).toBe(200);
        expect(okRes.body.ok).toBe(true);
        expect(JSON.parse(okRes.body.body).redirectMode).toBe('manual');

        // 3. 上游回傳 302 Open Redirect 時拒絕並標記為阻斷
        const redirectRes = await postProbe({
          targetUrl: 'https://api.finmindtrade.com/api/v4/redirect-trap',
        });
        expect(redirectRes.status).toBe(403);
        expect(redirectRes.body.error).toContain('REDIRECT');
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('T03: NAS 代理強制執行 1MB Body 上限 (413)、上游逾時中止 (504) 與 HTTPS-only 白名單', async () => {
      const { createNasServer } = require('../../scripts/nas-server.cjs');
      let abortedSeen = false;
      const slowFetcher = async (_url: string, init: any = {}) =>
        new Promise<any>((_resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              abortedSeen = true;
              const err: any = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });

      const { server } = createNasServer({
        customDbPath: TEST_DB,
        enableScheduler: false,
        upstreamFetcher: slowFetcher,
        maxRequestBodyBytes: 1024, // 1KB for fast deterministic test
        upstreamTimeoutMs: 60, // 60ms for fast deterministic test
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // 1. /api/proxy 拒絕 http:// 降級協定
        const httpDowngrade = await fetch(
          `${baseUrl}/api/proxy?url=${encodeURIComponent('http://api.stlouisfed.org/fred/series')}`
        );
        expect(httpDowngrade.status).toBe(403);

        // 2. 超過 Body 上限立即回 413 Payload Too Large
        const oversized = 'x'.repeat(2048);
        const tooLargeRes = await fetch(
          `${baseUrl}/api/proxy?url=${encodeURIComponent('https://api.stlouisfed.org/fred/series')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: oversized,
          }
        );
        expect(tooLargeRes.status).toBe(413);

        // 3. 上游掛起逾時自動觸發 AbortSignal 並回 504 Gateway Timeout
        const timeoutRes = await fetch(
          `${baseUrl}/api/proxy?url=${encodeURIComponent('https://api.stlouisfed.org/fred/series')}`
        );
        expect(timeoutRes.status).toBe(504);
        expect(abortedSeen).toBe(true);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  describe('Track B (T04–T05): Snapshot API Key Deep Redaction & Personal Trade Hardcoding Removal', () => {
    it('T04: redactBackupData 與 redactSnapshotsForExport 深度清洗頂層與每筆歷史快照內之明文 API Key', async () => {
      const { redactBackupData } = await import('./csvSanitizer');
      const { redactSnapshotsForExport } = await import('../utils/db');

      const secretA = 'FINMIND_SECRET_TOKEN_12345';
      const secretB = 'FMP_SECRET_KEY_67890';
      const secretC = 'FRED_SECRET_KEY_ABCDE';

      const sampleSnapshot: any = {
        id: 'snap-1',
        name: 'Pre-Import Snapshot',
        reason: 'AUTO_BEFORE_IMPORT',
        createdAt: '2026-11-25T00:00:00.000Z',
        metricsSummary: { totalTrades: 1, totalCashTransactions: 0, totalAccounts: 1, totalNavTwd: 100000 },
        payload: {
          trades: [{ id: 't1', symbol: '2330', shares: 1000 }],
          brokerAccounts: [],
          cashTransactions: [],
          loanRecords: [],
          historicalPrices: {},
          historicalFx: {},
          priceMetadata: {},
          apiKeys: {
            finmindToken: secretA,
            fmpApiKey: secretB,
            fredApiKey: secretC,
          },
          accountingView: 'CONSOLIDATED',
        },
      };

      // 1. 驗證 db 匯出快照脫敏契約
      const cleanedSnapshots = redactSnapshotsForExport([sampleSnapshot]);
      expect(cleanedSnapshots).toHaveLength(1);
      expect(cleanedSnapshots[0].payload.apiKeys.finmindToken).toBe('');
      expect(cleanedSnapshots[0].payload.apiKeys.fmpApiKey).toBe('');
      expect((cleanedSnapshots[0].payload.apiKeys as any).fredApiKey).toBe('');
      // 不得突變原物件，且交易明細完整保留
      expect(sampleSnapshot.payload.apiKeys.finmindToken).toBe(secretA);
      expect(cleanedSnapshots[0].payload.trades).toHaveLength(1);

      // 2. 驗證 redactBackupData 覆蓋 V1 / V2 頂層、payload 與 snapshots 全深度
      const archiveV2 = {
        schemaVersion: '2.0.0',
        settings: { apiKeys: { finmindToken: secretA } },
        snapshots: [sampleSnapshot],
        payload: {
          settings: { apiKeys: { fmpApiKey: secretB } },
          snapshots: [sampleSnapshot],
        },
        data: {
          settings: [{ key: 'apiKeys', value: { fredApiKey: secretC } }],
          snapshots: [sampleSnapshot],
        },
      };

      const redacted = redactBackupData(archiveV2);
      expect(redacted.isRedacted).toBe(true);
      const serialized = JSON.stringify(redacted.data);
      expect(serialized).not.toContain(secretA);
      expect(serialized).not.toContain(secretB);
      expect(serialized).not.toContain(secretC);
    });

    it('T05: storage 模組移除硬編碼個人嘉信交易校正，帳本初始化不竄改 SGOV/VT 交易金額', async () => {
      const storageMod: any = await import('../utils/storage');
      expect(storageMod.autoReconcileSchwabRecords).toBeUndefined();

      // 模擬 localStorage 存有 SGOV 89 股自訂價，驗證初始化不會被靜默改成 100.38
      const store = new Map<string, string>();
      const fakeTrades = [
        {
          id: 'user-sgov-1',
          date: '2026-01-01',
          symbol: 'SGOV',
          name: 'SGOV',
          market: 'US',
          type: 'BUY',
          shares: 89,
          price: 99.5,
          fee: 1,
          tax: 0,
        },
      ];
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      });
      storageMod.saveTradesToStorage(fakeTrades);

      const init = await storageMod.initializeStorageAsync();
      expect(init.trades).toHaveLength(1);
      expect(init.trades[0].price).toBe(99.5);
      expect(init.trades[0].fee).toBe(1);
      vi.unstubAllGlobals();
    });
  });

  describe('Track C (T06–T08): Deadlock-Free Lock-Scoped Fetch & US Abort Chain Closure', () => {
    it('T06: fetchWithTimeout 強制執行逾時中止並複合支援外部 AbortSignal', async () => {
      const { fetchWithTimeout } = require('../../scripts/market-sync/market-sync-core.cjs');
      expect(typeof fetchWithTimeout).toBe('function');

      // 1. 掛起請求於 timeoutMs 內自動 abort
      let abortedByTimeout = false;
      const hangingFetch = (_url: string, init: any = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            abortedByTimeout = true;
            const err: any = new Error('Aborted by timeout');
            err.name = 'AbortError';
            reject(err);
          });
        });

      await expect(
        fetchWithTimeout('https://example.com/slow', { fetcher: hangingFetch, timeoutMs: 40 })
      ).rejects.toThrow();
      expect(abortedByTimeout).toBe(true);

      // 2. 外部 AbortSignal 提前觸發時立即中止
      let abortedByParent = false;
      const parentCtrl = new AbortController();
      const parentHangFetch = (_url: string, init: any = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            abortedByParent = true;
            const err: any = new Error('Aborted by parent');
            err.name = 'AbortError';
            reject(err);
          });
        });
      setTimeout(() => parentCtrl.abort(), 20);
      await expect(
        fetchWithTimeout('https://example.com/slow', {
          fetcher: parentHangFetch,
          timeoutMs: 5000,
          signal: parentCtrl.signal,
        })
      ).rejects.toThrow();
      expect(abortedByParent).toBe(true);

      // 3. 正常回應直接透傳
      const okRes = await fetchWithTimeout('https://example.com/ok', {
        fetcher: async () => ({ ok: true, status: 200, json: async () => ({ hello: 'world' }) }),
        timeoutMs: 1000,
      });
      expect(okRes.ok).toBe(true);
    });

    it('T07: 台股 6 條鎖內採集管線在面對掛起上游時全部於逾時內安全中止不死鎖', async () => {
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      const db = initSqliteLakehouseDb(TEST_DB);
      db.prepare(
        `INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
         VALUES ('2330', '台積電', 'TW', 'TWSE', 'STOCK', 'NORMAL', ?)`
      ).run(Date.now());

      const makeHangingFetcher = () => {
        const tracker = { signalReceived: false, aborted: false };
        const fetcher = (_url: string, init: any = {}) =>
          new Promise((_resolve, reject) => {
            if (init?.signal) {
              tracker.signalReceived = true;
              init.signal.addEventListener('abort', () => {
                tracker.aborted = true;
                const err: any = new Error('Timeout aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          });
        return { fetcher, tracker };
      };

      const { runTdccIngestion } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
      const { runMonthlyRevenueIngestion } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');
      const { fetchTwseHistoricalDividends, fetchTpexHistoricalDividends } = require('../../scripts/market-sync/ingest-tw-corporate-actions.cjs');
      const { fetchAndIngestEtfDailyNav } = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');
      const { fetchAndIngestTwPledge } = require('../../scripts/market-sync/ingest-tw-pledge.cjs');
      const { fetchAndTagTwStockStatuses } = require('../../scripts/market-sync/tag-tw-stock-status.cjs');

      // 1. TDCC
      const t1 = makeHangingFetcher();
      await runTdccIngestion(TEST_DB, { fetcher: t1.fetcher, timeoutMs: 40 });
      expect(t1.tracker.signalReceived && t1.tracker.aborted).toBe(true);

      // 2. 月營收
      const t2 = makeHangingFetcher();
      await runMonthlyRevenueIngestion(TEST_DB, { fetcher: t2.fetcher, timeoutMs: 40 });
      expect(t2.tracker.signalReceived && t2.tracker.aborted).toBe(true);

      // 3. 除權息 TWSE/TPEx
      const t3a = makeHangingFetcher();
      await expect(fetchTwseHistoricalDividends(2026, t3a.fetcher, undefined, 40)).rejects.toThrow();
      expect(t3a.tracker.signalReceived && t3a.tracker.aborted).toBe(true);
      const t3b = makeHangingFetcher();
      await expect(fetchTpexHistoricalDividends(2026, t3b.fetcher, undefined, 40)).rejects.toThrow();
      expect(t3b.tracker.signalReceived && t3b.tracker.aborted).toBe(true);

      // 4. ETF 淨值
      const t4 = makeHangingFetcher();
      const etfRes = await fetchAndIngestEtfDailyNav(TEST_DB, '2026-11-23', t4.fetcher, { timeoutMs: 40 });
      expect(etfRes.success).toBe(false);
      expect(t4.tracker.signalReceived && t4.tracker.aborted).toBe(true);

      // 5. 董監質押
      const t5 = makeHangingFetcher();
      await fetchAndIngestTwPledge(TEST_DB, t5.fetcher, { timeoutMs: 40, silent: true });
      expect(t5.tracker.signalReceived && t5.tracker.aborted).toBe(true);

      // 6. 注意/處置狀態標記
      const t6 = makeHangingFetcher();
      await fetchAndTagTwStockStatuses(TEST_DB, { fetcher: t6.fetcher, timeoutMs: 40, silent: true });
      expect(t6.tracker.signalReceived && t6.tracker.aborted).toBe(true);
    });

    it('T08: getOrFetchUsFundamentals 正確將 AbortSignal 穿透至底層 fetchImpl，且美股/SEC 代理強制逾時防死鎖', async () => {
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      const {
        getOrFetchUsFundamentals,
        fetchAndIngestUsDividends,
        resetUsFundamentalsStateForTest,
      } = require('../../scripts/market-sync/us-fundamentals-ingestion.cjs');
      const {
        loadSecTickerCikMap,
        resetSecProxyStateForTest,
      } = require('../../scripts/market-sync/sec-edgar-proxy.cjs');

      resetUsFundamentalsStateForTest();
      if (typeof resetSecProxyStateForTest === 'function') resetSecProxyStateForTest();
      const db = initSqliteLakehouseDb(TEST_DB);

      // 1. 驗證外部 AbortController 能穿透 getOrFetchUsFundamentals -> fetchYahooQuoteSummaryWithCrumb
      const ctrl = new AbortController();
      let seenSignals = 0;
      let abortedSeen = false;
      const customFetch = (_url: string, init: any = {}) =>
        new Promise((_resolve, reject) => {
          if (init?.signal) {
            seenSignals++;
            init.signal.addEventListener('abort', () => {
              abortedSeen = true;
              const err: any = new Error('Parent aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      setTimeout(() => ctrl.abort(), 25);
      const usRes = await getOrFetchUsFundamentals(db, 'AAPL', {
        fetchFn: customFetch,
        signal: ctrl.signal,
        timeoutMs: 5000,
      });
      expect(usRes).toBeNull();
      expect(seenSignals).toBeGreaterThan(0);
      expect(abortedSeen).toBe(true);

      // 2. 驗證 fetchAndIngestUsDividends 在掛起時受 timeoutMs 中止
      let divAborted = false;
      const hangDiv = (_url: string, init: any = {}) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            divAborted = true;
            const err: any = new Error('Div timeout');
            err.name = 'AbortError';
            reject(err);
          });
        });
      const divRes = await fetchAndIngestUsDividends(db, 'AAPL', { fetchImpl: hangDiv, timeoutMs: 40 });
      expect(divRes.success).toBe(false);
      expect(divAborted).toBe(true);

      // 3. 驗證 SEC EDGAR 代理在掛起時受 timeoutMs 中止
      let secAborted = false;
      const hangSec = (_url: string, init: any = {}) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            secAborted = true;
            const err: any = new Error('SEC timeout');
            err.name = 'AbortError';
            reject(err);
          });
        });
      await expect(
        loadSecTickerCikMap({
          forceRefresh: true,
          cachePath: path.join(TEST_DIR, 'sec_tickers.json'),
          fetchImpl: hangSec,
          timeoutMs: 40,
          minIntervalMs: 0,
        })
      ).rejects.toThrow();
      expect(secAborted).toBe(true);
    });
  });

  describe('Track D (T09–T10): Static Market Cache Physical Retirement, Dockerfile Parity & Palette SSOT', () => {
    it('T09: 引擎層不再向 /market-cache/*.json 發起請求、public/market-cache 無巨檔殘留，且備用 Dockerfile 同步複製休市日曆', async () => {
      const {
        loadMarketCacheSummary,
        loadSymbolCompactHistory,
        getLatestSummaryQuote,
        loadSymbolHistoryFromLakehouse,
      } = await import('./marketCacheLoader');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 404 }) as any
      );

      expect(await loadMarketCacheSummary('TW')).toBeNull();
      expect(await loadSymbolCompactHistory('2330')).toBeNull();
      expect(await getLatestSummaryQuote('2330')).toBeNull();
      expect(await loadSymbolHistoryFromLakehouse('2330', 'TW')).toBeNull();

      // 任何呼叫皆不得觸發 /market-cache/ 靜態檔抓取
      const staticCalls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/market-cache/'));
      expect(staticCalls).toEqual([]);

      // 確認 public/market-cache 不再殘留退役靜態 JSON 市場快取巨檔
      const retiredCaches = new Set([
        'tw_market_ohlcv_compact.json',
        'tw_market_summary.json',
        'us_market_summary.json',
      ]);
      const publicCacheDir = path.resolve(process.cwd(), 'public/market-cache');
      const remainingJson = fs.existsSync(publicCacheDir)
        ? fs.readdirSync(publicCacheDir).filter((f: string) => retiredCaches.has(f))
        : [];
      expect(remainingJson).toEqual([]);

      // 確認備用部署參考 Dockerfile 已同步複製法定休市日曆
      const mirrorDockerfile = fs.readFileSync(
        path.resolve(process.cwd(), 'docs/deployment/docker/Dockerfile'),
        'utf8'
      );
      expect(mirrorDockerfile).toContain('market-holidays.json');
    });

    it('T10: BullBearEnergyCard、BullBearStrengthCard 與 AiDecisionCoreCard 全面使用 Directional Palette SSOT', async () => {
      const { resolveDirectionalPalette } = await import('../constants/designTokens');
      const { getTrendBadgeStyle } = await import('../components/aiForceDashboard/cards/AiDecisionCoreCard');

      const tw = resolveDirectionalPalette('taiwan', 'TW');
      const us = resolveDirectionalPalette('international', 'US');
      expect(tw.upLightColor).toBe('#f87171');
      expect(tw.downLightColor).toBe('#34d399');
      expect(us.upLightColor).toBe('#34d399');
      expect(us.downLightColor).toBe('#f87171');

      // AiDecisionCoreCard 傳入台股主題時應依 Directional Palette 反轉紅多綠空
      const twBull = getTrendBadgeStyle('強烈多頭', 'taiwan', 'TW');
      const usBull = getTrendBadgeStyle('強烈多頭', 'international', 'US');
      expect(twBull.color).toBe('#ef4444');
      expect(usBull.color).toBe('#10b981');

      // 驗證 BullBearEnergyCard 與 BullBearStrengthCard 皆已改引 resolveDirectionalPalette 零裸色票三元式
      const energySrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/aiForceDashboard/cards/BullBearEnergyCard.tsx'),
        'utf8'
      );
      const strengthSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/aiForceDashboard/cards/BullBearStrengthCard.tsx'),
        'utf8'
      );
      expect(energySrc).toContain('resolveDirectionalPalette');
      expect(strengthSrc).toContain('resolveDirectionalPalette');
      expect(energySrc).not.toMatch(/isTaiwan\s*\?\s*['"]#(?:f87171|34d399|ef4444|10b981)['"]/);
      expect(strengthSrc).not.toMatch(/isTaiwan\s*\?\s*['"]#(?:f87171|34d399|ef4444|10b981)['"]/);
    });
  });
});
