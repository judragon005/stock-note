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

  it('3. /api/market/history/:symbol 應能連帶查詢並回傳 tw_valuation_daily 官方估值 (Spec 0197 Ticket 01)', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT INTO symbols_meta (symbol, name, market, updated_at) VALUES ('4979', '華星光', 'TW', 12345)").run();
    db.prepare("INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES ('4979', '2026-10-20', 480, 485, 466, 470, 470, 1376000)").run();
    db.prepare("INSERT INTO tw_valuation_daily (symbol, date, pe, pb, dividend_yield, updated_at) VALUES ('4979', '2026-10-20', 78.56, 15.39, 0.45, 12345)").run();

    const middleware = createMarketApiMiddleware(testDbPath);

    let responseData = '';
    const req = { url: '/api/market/history/4979?limit=250', method: 'GET' };
    const res = {
      writeHead: vi.fn(),
      end: (data: string) => { responseData = data; },
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(responseData).toBeTruthy();
    const json = JSON.parse(responseData);
    expect(json.symbol).toBe('4979');
    expect(json.valuation).toBeDefined();
    expect(json.valuation.pe).toBe(78.56);
    expect(json.valuation.pb).toBe(15.39);
    expect(json.valuation.dividend_yield).toBe(0.45);

    closeSqliteDb();
  });

  it('4. loadSymbolFullLakehouseData 應能精確映射 valuation 物件 (Spec 0197 Ticket 01)', async () => {
    const { loadSymbolFullLakehouseData } = await import('./marketCacheLoader');

    const fakePayload = {
      symbol: '4979',
      candles: [{ date: '2026-10-20', open: 480, high: 485, low: 466, close: 470, volume: 1376000 }],
      chips: {},
      valuation: { pe: 78.56, pb: 15.39, dividend_yield: 0.45 }
    };

    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakePayload,
    });

    const result = await loadSymbolFullLakehouseData('4979', 'TW');
    expect(result).not.toBeNull();
    expect(result?.valuation).toBeDefined();
    expect(result?.valuation?.pe).toBe(78.56);
    expect(result?.valuation?.pb).toBe(15.39);
    expect(result?.valuation?.dividendYield).toBe(0.45);
  });

  it('5. /api/market/history/:symbol 應能連帶回傳 macro 宏觀數據 (Spec 0200 Ticket 01)', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2344', '華邦電', 'TW', 12345)").run();
    db.prepare("INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES ('2344', '2026-10-21', 157.5, 161.5, 156, 159.5, 159.5, 49816848)").run();
    db.prepare("INSERT INTO macro_sentiment_daily (date, treasury_yield_10y, tw_put_call_ratio, cnn_fear_greed_score, vix_close, updated_at) VALUES ('2026-10-20', 4.12, 105.4, 54, 18.25, 12345)").run();

    const middleware = createMarketApiMiddleware(testDbPath);

    let responseData = '';
    const req = { url: '/api/market/history/2344?limit=250', method: 'GET' };
    const res = {
      writeHead: vi.fn(),
      end: (data: string) => { responseData = data; },
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(responseData).toBeTruthy();
    const json = JSON.parse(responseData);
    expect(json.symbol).toBe('2344');
    expect(json.macro).toBeDefined();
    expect(json.macro.treasury_yield_10y).toBe(4.12);
    expect(json.macro.tw_put_call_ratio).toBe(105.4);
    expect(json.macro.vix_close).toBe(18.25);

    closeSqliteDb();
  });

  it('6. loadSymbolFullLakehouseData 當最新日資券為 null 時應能向前回溯最新有效資券 (Spec 0200 Ticket 01)', async () => {
    const { loadSymbolFullLakehouseData } = await import('./marketCacheLoader');

    const fakePayload = {
      symbol: '2344',
      candles: [
        { date: '2026-10-16', open: 153, high: 157.5, low: 151, close: 152.5, volume: 42095409 },
        { date: '2026-10-20', open: 157.5, high: 161.5, low: 156, close: 159.5, volume: 49816848 }
      ],
      chips: {
        '2026-10-16': { date: '2026-10-16', foreign_net: 12224, margin_balance: 112612, short_balance: 670, day_trade_rate: 60.5 },
        '2026-10-20': { date: '2026-10-20', foreign_net: 423, margin_balance: null, short_balance: null, day_trade_rate: null }
      },
      macro: {
        date: '2026-10-20',
        treasury_yield_10y: 4.12,
        tw_put_call_ratio: 105.4,
        cnn_fear_greed_score: 54,
        vix_close: 18.25
      }
    };

    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakePayload,
    });

    const result = await loadSymbolFullLakehouseData('2344', 'TW');
    expect(result).not.toBeNull();
    // 最新一筆 (10-20) 資券為 null，應自動回退至 10-16 的有效值
    expect(result?.marginBalance).toBe(112612);
    expect(result?.shortBalance).toBe(670);
    expect(result?.dayTradeRate).toBe(60.5);
    expect((result as any)?.marginAsOfDate).toBe('2026-10-16');
    expect((result as any)?.macro).toBeDefined();
    expect((result as any)?.macro.treasury_yield_10y).toBe(4.12);
  });
});
