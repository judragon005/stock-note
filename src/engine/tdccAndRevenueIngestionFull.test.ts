import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 02 & 03 - 台股 TDCC 集保與月營收批次入庫管線 (Spec 0164)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_tdcc_rev.db');

  beforeEach(() => {
    try {
      const { closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      closeSqliteDb();
    } catch {}
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    try {
      const { closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      closeSqliteDb();
    } catch {}
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('1. runTdccIngestion 應能從 TDCC OpenData CSV 解析並入庫真實股權分散表，並清除舊有合成假資料', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runTdccIngestion, purgeSyntheticRecords } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2454', '聯發科', 'TW', 12345)").run();

    // 插入一筆舊版合成假資料 (under_10_ratio = (100 - over_400_ratio) * 0.6)
    db.prepare(`
      INSERT INTO tw_tdcc_distribution (symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at)
      VALUES ('2330', '2026-09-25', 100000, 70.00, 60.00, 18.00, 12345)
    `).run();

    const mockCsv = [
      '資料日期,證券代號,持股分級,人數,股數,占集保庫存數比例%',
      '20261002,2330,1,500000,100000000,0.39',
      '20261002,2330,15,1500,22000000000,84.83',
      '20261002,2330,17,1200000,25932071000,100.00',
      '20261002,2454,1,80000,20000000,1.25',
      '20261002,2454,15,400,1100000000,68.75',
      '20261002,2454,17,250000,1600000000,100.00',
    ].join('\n');

    const mockFetcher = async (url: string) => {
      expect(url).toBe('https://smart.tdcc.com.tw/opendata/getOD.ashx?id=1-5');
      return {
        ok: true,
        text: async () => mockCsv,
      };
    };

    const { savedCount, targetDate } = await runTdccIngestion(testDbPath, '2026-10-02', 1, { fetcher: mockFetcher });
    expect(savedCount).toBe(2);
    expect(targetDate).toBe('2026-10-02');

    const rows = db.prepare("SELECT * FROM tw_tdcc_distribution WHERE date = '2026-10-02'").all();
    expect(rows.length).toBe(2);
    const tsmc = rows.find((r: any) => r.symbol === '2330');
    expect(tsmc.over_1000_ratio).toBeCloseTo(84.84, 1);
    expect(tsmc.total_shareholders).toBe(1200000);

    // 舊有合成假資料應已被 purgeSyntheticRecords 清除
    expect(typeof purgeSyntheticRecords).toBe('function');
    const oldSynthetic = db.prepare("SELECT * FROM tw_tdcc_distribution WHERE date = '2026-09-25'").all();
    expect(oldSynthetic.length).toBe(0);

    closeSqliteDb();
  });

  it('2. runTdccIngestion 離線或抓取失敗時應回傳 savedCount: 0 且不寫入任何假資料', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runTdccIngestion } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();

    const offlineFetcher = async () => {
      throw new Error('ECONNREFUSED');
    };

    const res = await runTdccIngestion(testDbPath, '2026-10-02', 1, { fetcher: offlineFetcher });
    expect(res.savedCount).toBe(0);

    const rows = db.prepare('SELECT * FROM tw_tdcc_distribution').all();
    expect(rows.length).toBe(0);

    closeSqliteDb();
  });

  it('3. runMonthlyRevenueIngestion 應能從 TWSE/TPEx OpenAPI 解析並入庫真實月營收與年增率', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runMonthlyRevenueIngestion, purgeSyntheticRecords } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2454', '聯發科', 'TW', 12345)").run();

    const mockTwse = [
      {
        資料年月: '11508',
        公司代號: '2330',
        '營業收入-當月營收': '250866000',
        '營業收入-上月營收': '240000000',
        '營業收入-去年當月營收': '210000000',
        '營業收入-上月比較增減(%)': '4.53',
        '營業收入-去年同月增減(%)': '19.46',
      },
    ];
    const mockTpex = [
      {
        資料年月: '11508',
        公司代號: '2454',
        '營業收入-當月營收': '45000000',
        '營業收入-上月營收': '42000000',
        '營業收入-去年當月營收': '40000000',
        '營業收入-上月比較增減(%)': '7.14',
        '營業收入-去年同月增減(%)': '12.50',
      },
    ];

    const mockFetcher = async (url: string) => {
      if (url.includes('openapi.twse.com.tw')) {
        return { ok: true, json: async () => mockTwse };
      }
      if (url.includes('tpex.org.tw')) {
        return { ok: true, json: async () => mockTpex };
      }
      return { ok: false, status: 404 };
    };

    const { savedCount, yearMonth } = await runMonthlyRevenueIngestion(testDbPath, '2026-08', 1, { fetcher: mockFetcher });
    expect(savedCount).toBe(2);
    expect(yearMonth).toBe('2026-08');
    expect(typeof purgeSyntheticRecords).toBe('function');

    const rows = db.prepare("SELECT * FROM tw_monthly_revenue WHERE year_month = '2026-08'").all();
    expect(rows.length).toBe(2);
    const tsmc = rows.find((r: any) => r.symbol === '2330');
    expect(tsmc.revenue).toBe(250866000);
    expect(tsmc.yoy_rate).toBe(19.46);

    closeSqliteDb();
  });

  it('4. runMonthlyRevenueIngestion 離線或抓取失敗時應回傳 savedCount: 0 且不寫入任何假資料', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runMonthlyRevenueIngestion } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();

    const offlineFetcher = async () => {
      throw new Error('ETIMEDOUT');
    };

    const res = await runMonthlyRevenueIngestion(testDbPath, '2026-08', 1, { fetcher: offlineFetcher });
    expect(res.savedCount).toBe(0);

    const rows = db.prepare('SELECT * FROM tw_monthly_revenue').all();
    expect(rows.length).toBe(0);

    closeSqliteDb();
  });

  it('5. /api/market/history/:symbol 應回傳最新 1 筆 etfNav 與最近 16 筆 corporateActions', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('0050', '元大台灣50', 'TW', 12345)").run();

    db.prepare(`
      INSERT INTO etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at)
      VALUES ('0050', '2026-10-01', 180.0, 179.5, 0.28, 12345),
             ('0050', '2026-10-02', 182.0, 181.2, 0.44, 12346)
    `).run();

    for (let i = 1; i <= 18; i++) {
      const mm = String((i % 12) + 1).padStart(2, '0');
      const yyyy = i <= 12 ? 2025 : 2026;
      db.prepare(`
        INSERT INTO corporate_action_calendar (symbol, market, action_type, ex_date, cash_dividend_per_share, updated_at)
        VALUES ('0050', 'TW', 'DIVIDEND', ?, ?, 12345)
      `).run(`${yyyy}-${mm}-15`, 1.0 + i * 0.1);
    }

    const middleware = createMarketApiMiddleware(testDbPath);
    let statusCode = 0;
    let bodyStr = '';
    const req: any = { url: '/api/market/history/0050?limit=10', method: 'GET' };
    const res: any = {
      writeHead: (code: number) => { statusCode = code; },
      end: (chunk: string) => { bodyStr = chunk; },
    };

    await new Promise<void>((resolve) => {
      middleware(req, res, () => resolve());
      setTimeout(resolve, 50);
    });

    expect(statusCode).toBe(200);
    const payload = JSON.parse(bodyStr);
    expect(payload.etfNav).toBeTruthy();
    expect(payload.etfNav.date).toBe('2026-10-02');
    expect(payload.etfNav.nav).toBe(181.2);
    expect(Array.isArray(payload.corporateActions)).toBe(true);
    expect(payload.corporateActions.length).toBe(16);
    expect(payload.corporateActions[0].ex_date >= payload.corporateActions[1].ex_date).toBe(true);

    closeSqliteDb();
  });
});
