import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
const { runTdccIngestion } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
const { runMonthlyRevenueIngestion } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

const TEST_DB_PATH = path.resolve(process.cwd(), '.scratch/test-market-cache/test_series.db');

describe('Spec 0172 / Ticket 02: TDCC 集保千張大戶與月營收歷史時間序列回補 (TDD)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    // 注入測試標的 3260 與 2330
    const now = Date.now();
    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, exchange, type, updated_at)
      VALUES (?, ?, 'TW', 'TPEX', 'STOCK', ?), (?, ?, 'TW', 'TWSE', 'STOCK', ?)
    `).run('3260', '威剛', now, '2330', '台積電', now);
  });

  afterEach(() => {
    try {
      closeSqliteDb();
    } catch {
      // ignore
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
  });

  it('1. runTdccIngestion 應拒絕生成 Math.sin 合成假資料，並於真實抓取時寫入對應週別資料', async () => {
    const mockCsv = [
      '資料日期,證券代號,持股分級,人數,股數,占集保庫存數比例%',
      '20261002,3260,1,12000,5000000,1.60',
      '20261002,3260,15,45,120000000,38.46',
      '20261002,3260,17,45000,312000000,100.00',
      '20261002,2330,1,500000,100000000,0.39',
      '20261002,2330,15,1500,22000000000,84.83',
      '20261002,2330,17,1200000,25932071000,100.00',
    ].join('\n');

    const { savedCount, weeksCount } = await runTdccIngestion(TEST_DB_PATH, undefined, undefined, {
      fetcher: async () => ({ ok: true, text: async () => mockCsv }),
    });
    expect(savedCount).toBe(2);
    expect(weeksCount).toBe(1);

    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    const rows3260 = db.prepare('SELECT date, over_1000_ratio, total_shareholders FROM tw_tdcc_distribution WHERE symbol = ? ORDER BY date DESC').all('3260');
    expect(rows3260.length).toBe(1);
    expect((rows3260[0] as any).total_shareholders).toBe(45000);
  });

  it('2. runMonthlyRevenueIngestion 應拒絕生成 Math.sin 合成假資料，並於真實抓取時寫入對應月份營收', async () => {
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
        公司代號: '3260',
        '營業收入-當月營收': '3200000',
        '營業收入-上月營收': '3000000',
        '營業收入-去年當月營收': '2500000',
        '營業收入-上月比較增減(%)': '6.67',
        '營業收入-去年同月增減(%)': '28.00',
      },
    ];

    const { yearMonth, savedCount, monthsCount } = await runMonthlyRevenueIngestion(TEST_DB_PATH, undefined, undefined, {
      fetcher: async (url: string) => {
        if (url.includes('openapi.twse.com.tw')) return { ok: true, json: async () => mockTwse };
        return { ok: true, json: async () => mockTpex };
      },
    });
    expect(savedCount).toBe(2);
    expect(monthsCount).toBe(1);

    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    const rows3260 = db.prepare('SELECT year_month, revenue, yoy_rate FROM tw_monthly_revenue WHERE symbol = ? ORDER BY year_month DESC').all('3260');
    expect(rows3260.length).toBe(1);

    const latest = rows3260[0] as any;
    expect(latest.year_month).toBe(yearMonth);
    expect(latest.revenue).toBe(3200000);
    expect(latest.yoy_rate).toBe(28);
  });
});
