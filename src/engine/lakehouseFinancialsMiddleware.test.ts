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

describe('Spec 0203 Ticket 08: financial_statements_quarterly 湖倉表與查詢路由 (TDD)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_financials_api.db');

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

  it('1. initSqliteLakehouseDb 應正確建立 financial_statements_quarterly 表結構與索引', () => {
    const db = initSqliteLakehouseDb(testDbPath);
    const tableInfo = db.prepare('PRAGMA table_info(financial_statements_quarterly)').all();
    const colNames = tableInfo.map((c: any) => c.name);

    expect(colNames).toContain('symbol');
    expect(colNames).toContain('market');
    expect(colNames).toContain('year');
    expect(colNames).toContain('quarter');
    expect(colNames).toContain('revenue');
    expect(colNames).toContain('net_income');
    expect(colNames).toContain('eps');
    expect(colNames).toContain('operating_cash_flow');
    expect(colNames).toContain('free_cash_flow');
    expect(colNames).toContain('total_assets');
  });

  it('2. POST /api/market/financials 應支援批次入庫 16 核心科目三表數據', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const mockPayload = {
      records: [
        {
          symbol: '2330',
          market: 'TW',
          year: 2026,
          quarter: 2,
          revenue: 673510000000,
          grossProfit: 358420000000,
          operatingIncome: 286540000000,
          netIncome: 247850000000,
          eps: 9.56,
          totalAssets: 5543200000000,
          totalLiabilities: 1823100000000,
          totalEquity: 3720100000000,
          currentAssets: 2120000000000,
          currentLiabilities: 1200000000000,
          accountsReceivable: 198000000000,
          inventory: 285000000000,
          operatingCashFlow: 382000000000,
          capitalExpenditure: 195000000000,
          freeCashFlow: 187000000000,
          cashDividendsPaid: 103700000000,
        },
        {
          symbol: '2330',
          market: 'TW',
          year: 2026,
          quarter: 1,
          revenue: 592640000000,
          netIncome: 225490000000,
          eps: 8.70,
        },
      ],
    };

    const res = await simulateRequest(middleware, '/api/market/financials', {
      method: 'POST',
      body: mockPayload,
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.count).toBe(2);
  });

  it('3. GET /api/market/financials/:symbol 應能高速自 SQLite 返回排序之季度三表', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/financials/2330');

    expect(res.status).toBe(200);
    expect(res.data.symbol).toBe('2330');
    expect(res.data.count).toBe(2);
    expect(res.data.financials).toHaveLength(2);

    // 由新至舊排序 (2026 Q2 在前)
    const latest = res.data.financials[0];
    expect(latest.year).toBe(2026);
    expect(latest.quarter).toBe(2);
    expect(latest.eps).toBe(9.56);
    expect(latest.freeCashFlow).toBe(187000000000);
  });
});
