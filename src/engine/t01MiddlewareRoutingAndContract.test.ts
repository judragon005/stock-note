import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  getOtcAliasCandidates,
  loadSymbolFullLakehouseData,
} from './marketCacheLoader';
import {
  mapQuarterlyRecordToLakehouseRow,
  mapLakehouseRowToQuarterlyRecord,
} from './lakehouseFinancialClient';
import { fetchWithCORSProxy, proxyCircuitBreaker } from './priceFetcher';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };
declare const setImmediate: any;

const fs = require('fs');
const path = require('path');

const {
  createMarketApiMiddleware,
} = require('../../scripts/market-sync/vite-market-middleware.cjs');
const {
  initSqliteLakehouseDb,
  getMarketMultiHorizonBreadth,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

function simulateRequest(
  middleware: any,
  url: string,
  options?: { method?: string; body?: any; headers?: Record<string, string> }
): Promise<{ status: number; headers: any; data: any }> {
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
        let parsed: any = body;
        try {
          parsed = JSON.parse(body);
        } catch {}
        resolve({ status: statusCode, headers, data: parsed });
      },
    };

    const next = () => {
      resolve({ status: 404, headers: {}, data: { error: 'PASSTHROUGH_NEXT' } });
    };

    middleware(req, res, next);

    if (options?.body !== undefined) {
      setImmediate(() => {
        const payload =
          typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.emit('data', payload);
        req.emit('end');
      });
    }
  });
}

describe('Spec 0239 T01 — 單例中介層、點號代碼路由 (BRK.B)、財報雙向契約與 meta 復用', () => {
  const testDbPath = path.resolve(
    process.cwd(),
    `.scratch/market-cache/test_t01_${Date.now()}.db`
  );

  afterAll(() => {
    closeSqliteDb();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        if (fs.existsSync(`${testDbPath}${suffix}`)) fs.unlinkSync(`${testDbPath}${suffix}`);
      } catch {}
    }
  });

  beforeEach(() => {
    proxyCircuitBreaker.reset();
    vi.restoreAllMocks();
  });

  it('1. 路由應支援含點號美股代碼 BRK.B 並雙向別名探測 BRK-B（不穿透回傳 PASSTHROUGH_NEXT）', async () => {
    const db = initSqliteLakehouseDb(testDbPath);
    const now = Date.now();
    db.prepare(`
      INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('BRK-B', 'Berkshire Hathaway Inc.', 'US', 'NYSE', 'STOCK', 'NORMAL', now);

    db.prepare(`
      INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('BRK-B', '2026-11-18', 460, 468, 458, 466, 466, 3200000, 1490000000, null);

    db.prepare(`
      INSERT OR REPLACE INTO corporate_action_calendar (symbol, market, action_type, ex_date, cash_dividend_per_share, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('BRK-B', 'US', 'DIVIDEND', '2026-09-15', 0.5, now);

    const middleware = createMarketApiMiddleware(testDbPath);

    const histRes = await simulateRequest(middleware, '/api/market/history/BRK.B?limit=30');
    expect(histRes.status).toBe(200);
    expect(histRes.data.candles).toHaveLength(1);
    expect(histRes.data.meta?.name).toBe('Berkshire Hathaway Inc.');

    const quoteRes = await simulateRequest(middleware, '/api/market/quote/BRK.B');
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.data.quote?.close).toBe(466);
    expect(quoteRes.data.meta?.symbol).toBe('BRK-B');

    const caRes = await simulateRequest(middleware, '/api/market/corporate-actions/BRK.B');
    expect(caRes.status).toBe(200);
    expect(caRes.data.actions).toHaveLength(1);
  });

  it('2. 季度財報 POST/GET 應無損保留 cashDividendsPaid/dividendPaid、periodDate、cashAndEquivalents 與 source', async () => {
    initSqliteLakehouseDb(testDbPath);
    const middleware = createMarketApiMiddleware(testDbPath);

    const record = {
      symbol: 'BRK.B',
      market: 'US' as const,
      year: 2026,
      quarter: 3,
      periodDate: '2026-09-30',
      income: {
        revenue: 92000,
        grossProfit: 31000,
        operatingIncome: 14500,
        netIncome: 11200,
        eps: 5.18,
      },
      balanceSheet: {
        totalAssets: 1100000,
        totalLiabilities: 500000,
        totalEquity: 600000,
        accountsReceivable: 15000,
        inventory: 24000,
        cashAndEquivalents: 325000,
        currentAssets: 410000,
        currentLiabilities: 120000,
      },
      cashFlow: {
        operatingCashFlow: 18000,
        capitalExpenditure: 4000,
        stockBasedCompensation: 0,
        dividendPaid: 750,
      },
      auditInfo: { opinionType: 'UNQUALIFIED' as const, isBigFour: true },
      updatedAt: Date.now(),
    };

    const row = mapQuarterlyRecordToLakehouseRow(record, 'SEC');
    const postRes = await simulateRequest(middleware, '/api/market/financials', {
      method: 'POST',
      body: { records: [row] },
    });
    expect(postRes.status).toBe(200);
    expect(postRes.data.count).toBe(1);

    const getRes = await simulateRequest(middleware, '/api/market/financials/BRK.B');
    expect(getRes.status).toBe(200);
    expect(getRes.data.financials).toHaveLength(1);

    const restored = mapLakehouseRowToQuarterlyRecord(getRes.data.financials[0], 'US');
    expect(restored.periodDate).toBe('2026-09-30');
    expect(restored.balanceSheet.cashAndEquivalents).toBe(325000);
    expect(restored.cashFlow.dividendPaid).toBe(750);
    expect(getRes.data.financials[0].source).toBe('SEC');
  });

  it('3. loadSymbolFullLakehouseData 應復用歷史端點回傳之 meta，且 getOtcAliasCandidates 支援美股點號別名', async () => {
    expect(getOtcAliasCandidates('BRK.B', 'US')).toEqual(['BRK.B', 'BRK-B']);
    expect(getOtcAliasCandidates('BRK-B', 'US')).toEqual(['BRK-B', 'BRK.B']);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: '2330',
          meta: {
            symbol: '2330',
            name: '台積電',
            market: 'TW',
            type: 'STOCK',
            status: 'ATTENTION',
          },
          candles: [
            { date: '2026-11-18', open: 1000, high: 1020, low: 995, close: 1015, volume: 25000000 },
          ],
          chips: {},
        }),
      })
    );

    const payload = await loadSymbolFullLakehouseData('2330', 'TW');
    expect(payload?.meta?.status).toBe('ATTENTION');
    expect(payload?.meta?.type).toBe('STOCK');
    expect(payload?.meta?.name).toBe('台積電');
  });

  it('4. 寫入新日 K 後，getMarketMultiHorizonBreadth 應自動失效舊快取並反映最新日期', () => {
    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare(`
      INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2330', '2026-11-17', 1000, 1010, 990, 1005, 1005, 10000, 10000000, 500);

    const first = getMarketMultiHorizonBreadth(undefined, db);
    expect(first.tw.asOfDate).toBe('2026-11-17');

    db.prepare(`
      INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2330', '2026-11-18', 1010, 1030, 1005, 1025, 1025, 12000, 12000000, 600);

    const second = getMarketMultiHorizonBreadth(undefined, db);
    expect(second.tw.asOfDate).toBe('2026-11-18');
  });

  it('5. 本地代理回傳 HTTP 429 或 500 時，priceFetcher 應立即記錄熔斷並拋錯，不盲目穿透至第三方公共代理', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too Many Requests', code: 'RATE_LIMITED' }),
    });
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      fetchWithCORSProxy('https://query1.finance.yahoo.com/v8/finance/chart/NVDA', 2000)
    ).rejects.toThrow(/429|Proxy Gateway Failure|RATE_LIMITED/i);

    // 確認僅呼叫了 1 次本地 /api/yahoo 代理，未穿透至第三方 CORS 代理池
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/yahoo/');
  });
});
