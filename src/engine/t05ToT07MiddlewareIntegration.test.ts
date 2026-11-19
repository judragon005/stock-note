import { describe, it, expect, afterAll, vi } from 'vitest';
import { loadSymbolFullLakehouseData } from './marketCacheLoader';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  createMarketApiMiddleware,
  resetCatchupStateForTest,
} = require('../../scripts/market-sync/vite-market-middleware.cjs');
const {
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');
const {
  backfillPortfolioSeries,
} = require('../../scripts/market-sync/backfill-portfolio-series.cjs');

function simulateRequest(middleware: any, url: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.url = url;
    req.method = 'GET';
    req.headers = {};
    let statusCode = 200;
    const res = {
      writeHead(code: number) {
        statusCode = code;
        return this;
      },
      setHeader() {},
      end(chunk: string) {
        let parsed: any = chunk;
        try {
          parsed = JSON.parse(chunk || '');
        } catch {}
        resolve({ status: statusCode, data: parsed });
      },
    };
    middleware(req, res, () => resolve({ status: 404, data: { error: 'PASSTHROUGH' } }));
  });
}

describe('Spec 0239 T04/T05/T06/T07 中介層統一接線整合驗證', () => {
  const testDbPath = path.resolve(
    process.cwd(),
    `.scratch/market-cache/test_t05_t07_${Date.now()}.db`
  );

  afterAll(() => {
    closeSqliteDb();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        if (fs.existsSync(`${testDbPath}${suffix}`)) fs.unlinkSync(`${testDbPath}${suffix}`);
      } catch {}
    }
  });

  it('1. GET /api/market/history/:symbol 應逐欄非空合併最新宏觀指標並回傳 usFundamentals、quarterlyFinancials 與正向排序估值歷史', async () => {
    resetCatchupStateForTest();
    const db = initSqliteLakehouseDb(testDbPath);
    const now = Date.now();

    // 插入兩日宏觀：今日台股衍生品為 NULL，昨日有效
    db.prepare(`
      INSERT OR REPLACE INTO macro_sentiment_daily (
        date, cnn_fear_greed_score, vix_close, treasury_yield_10y,
        tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi, tw_margin_maintenance_ratio, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2026-11-18', 25.2, 25.4, 5.12, 112.5, -97896, 91226, 162.4, now - 86400000);
    db.prepare(`
      INSERT OR REPLACE INTO macro_sentiment_daily (
        date, cnn_fear_greed_score, vix_close, treasury_yield_10y,
        tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi, tw_margin_maintenance_ratio, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2026-11-19', 24.6, 24.5, 5.1, null, null, null, null, now);

    // 美股 NVDA 日 K + us_fundamentals_daily + 季度財報
    db.prepare(`
      INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('NVDA', 'NVIDIA Corp.', 'US', 'NASDAQ', 'STOCK', 'NORMAL', now);
    db.prepare(`
      INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('NVDA', '2026-11-18', 140, 145, 138, 144, 144, 42000000, 6000000000, null);
    db.prepare(`
      INSERT OR REPLACE INTO us_fundamentals_daily (
        symbol, date, pe, forward_pe, pb, ps_ratio, dividend_yield,
        institutional_ratio, insider_ratio, short_float_ratio, public_float_ratio,
        source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('NVDA', '2026-11-18', 48.2, 31.5, 42.1, 28.4, 0.03, 66.8, 4.2, 1.25, 29.0, 'YAHOO_QUOTESUMMARY', now);
    db.prepare(`
      INSERT OR REPLACE INTO financial_statements_quarterly (
        symbol, market, year, quarter, period_date, revenue, gross_profit, operating_income, net_income, eps, source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('NVDA', 'US', 2026, 3, '2026-09-30', 35100000000, 26300000000, 21800000000, 19300000000, 0.78, 'SEC', now);

    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/history/NVDA?limit=30');
    expect(res.status).toBe(200);
    // T04: 總經逐欄合併保留昨日台股期貨 OI / PCR / 維持率
    expect(res.data.macro.cnn_fear_greed_score).toBe(24.6);
    expect(res.data.macro.tw_foreign_futures_oi).toBe(-97896);
    expect(res.data.macro.tw_put_call_ratio).toBe(112.5);
    expect(res.data.macro.tw_margin_maintenance_ratio).toBe(162.4);
    // T06: usFundamentals 完整回傳
    expect(res.data.usFundamentals.forward_pe).toBe(31.5);
    expect(res.data.usFundamentals.institutional_ratio).toBe(66.8);
    // T07: quarterlyFinancials 完整回傳
    expect(res.data.quarterlyFinancials).toHaveLength(1);
    expect(res.data.quarterlyFinancials[0].revenue).toBe(35100000000);
    expect(res.data.enrichmentPending).toBe(false);

    // 驗證 marketCacheLoader 正確映射 us13fData / valuation / quarterlyFinancials
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => res.data })
    );
    const loaded = await loadSymbolFullLakehouseData('NVDA', 'US');
    expect(loaded?.valuation?.forwardPe).toBe(31.5);
    expect(loaded?.valuation?.psRatio).toBe(28.4);
    expect(loaded?.us13fData?.institutionalRatio).toBe(66.8);
    expect(loaded?.us13fData?.shortFloatRatio).toBe(1.25);
    expect(loaded?.quarterlyFinancials?.[0]?.revenue).toBe(35100000000);
    vi.restoreAllMocks();
  });

  it('2. backfillPortfolioSeries 應依台股個股/台股ETF/美股分流補齊且零例外', async () => {
    const calls: string[] = [];
    const summary = await backfillPortfolioSeries(['2330', '0050', 'VT'], {
      dbPath: testDbPath,
      throttleMs: 0,
      handlers: {
        backfillSymbolTdccHistory: async (sym: string) => {
          calls.push(`tdcc:${sym}`);
        },
        backfillSymbolMonthlyRevenue: async (sym: string) => {
          calls.push(`rev:${sym}`);
        },
        backfillSymbolDividendsFromRemote: async (sym: string) => {
          calls.push(`div:${sym}`);
        },
        getOrFetchUsFundamentals: async (_db: any, sym: string) => {
          calls.push(`usfund:${sym}`);
        },
      },
    });

    expect(summary.processed).toBe(3);
    expect(summary.twSucceeded).toBe(2);
    expect(summary.usSucceeded).toBe(1);
    expect(summary.errors).toHaveLength(0);
    expect(calls).toEqual([
      'tdcc:2330',
      'rev:2330',
      'div:2330',
      'tdcc:0050',
      'div:0050',
      'usfund:VT',
    ]);
  });
});
