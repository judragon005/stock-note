import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 04 - 湖倉 API 擴展與前端載入整合 (Spec 0164)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_api_ext.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    vi.restoreAllMocks();
  });

  it('1. /api/market/history/:symbol 應能連帶回傳 tdcc 與 revenue 數據', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES ('2330', '2026-10-02', 100, 105, 99, 102, 102, 1000)").run();
    db.prepare("INSERT INTO tw_institutional_chips (symbol, date, foreign_net) VALUES ('2330', '2026-10-02', 500)").run();
    db.prepare("INSERT INTO tw_tdcc_distribution (symbol, date, total_shareholders, over_1000_ratio, updated_at) VALUES ('2330', '2026-10-02', 1000000, 80.5, 12345)").run();
    db.prepare("INSERT INTO tw_monthly_revenue (symbol, year_month, revenue, yoy_rate, updated_at) VALUES ('2330', '2026-08', 250000, 30.2, 12345)").run();

    const middleware = createMarketApiMiddleware(testDbPath);

    let responseData = '';
    const req = { url: '/api/market/history/2330?limit=250', method: 'GET' };
    const res = {
      writeHead: vi.fn(),
      end: (data: string) => { responseData = data; },
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(responseData).toBeTruthy();
    const json = JSON.parse(responseData);
    expect(json.symbol).toBe('2330');
    expect(json.candles.length).toBe(1);
    expect(json.tdcc.length).toBe(1);
    expect(json.tdcc[0].over_1000_ratio).toBe(80.5);
    expect(json.revenue.length).toBe(1);
    expect(json.revenue[0].yoy_rate).toBe(30.2);

    closeSqliteDb();
  });

  it('2. loadSymbolFullLakehouseData 應能精確映射 tdccRecords 與 revenueRecords', async () => {
    const { loadSymbolFullLakehouseData } = await import('./marketCacheLoader');

    const fakePayload = {
      symbol: '2330',
      candles: [{ date: '2026-10-02', open: 100, high: 105, low: 99, close: 102, volume: 1000 }],
      chips: {
        '2026-10-02': { date: '2026-10-02', foreign_net: 500, trust_net: 200, dealer_net: -50 }
      },
      tdcc: [{ date: '2026-10-02', total_shareholders: 1200000, over_1000_ratio: 82.5, over_400_ratio: 88.0, under_10_ratio: 7.2 }],
      revenue: [{ year_month: '2026-08', revenue: 250000, yoy_rate: 33.5, mom_rate: 4.2, is_all_time_high: 1 }]
    };

    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakePayload,
    });

    const result = await loadSymbolFullLakehouseData('2330', 'TW');
    expect(result).not.toBeNull();
    expect(result?.candles.length).toBe(1);
    expect(result?.institutionalRecords?.length).toBe(1);
    expect(result?.tdccRecords?.length).toBe(1);
    expect(result?.tdccRecords?.[0].over1000Ratio).toBe(82.5);
    expect(result?.revenueRecords?.length).toBe(1);
    expect(result?.revenueRecords?.[0].yoyRate).toBe(33.5);
    expect(result?.revenueRecords?.[0].isAllTimeHigh).toBe(1);
  });
});
