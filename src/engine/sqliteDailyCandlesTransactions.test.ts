import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

// 引用 CJS 模組
const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
const { parseTwseDailyQuotes, parseTpexDailyQuotes, saveTwQuotesToSqlite } = require('../../scripts/market-sync/ingest-tw-quotes.cjs');
const { parseTwseDailyQuotesBulk, parseTpexDailyQuotesBulk } = require('../../scripts/market-sync/market-sync-core.cjs');

const TEST_DB_PATH = path.resolve(process.cwd(), '.scratch/test-market-cache/test_transactions.db');

describe('Spec 0172 / Ticket 01: 台股收盤行情成交筆數解析與 SQLite 入庫持久化 (TDD Seam 1)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
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

  it('1. parseTwseDailyQuotes 與 parseTwseDailyQuotesBulk 應正確提取 TWSE MI_INDEX row[3] 之成交筆數', () => {
    const mockTwse = {
      tables: [
        {
          data: [
            ['2330', '台積電', '45,123,456', '35,888', '45,000,000,000', '1000.00', '1020.00', '995.00', '1015.00'],
          ],
        },
      ],
    };

    const res1 = parseTwseDailyQuotes(mockTwse, '2026-10-08');
    expect(res1['2330']).toBeDefined();
    expect(res1['2330'].transactions).toBe(35888);
    expect(res1['2330'].volume).toBe(45123456);

    const res2 = parseTwseDailyQuotesBulk(mockTwse, '2026-10-08');
    expect(res2['2330']).toBeDefined();
    expect(res2['2330'].transactions).toBe(35888);
    expect(res2['2330'].volume).toBe(45123456);
  });

  it('2. parseTpexDailyQuotes 與 parseTpexDailyQuotesBulk 應正確提取 TPEx 1430 row[7] 股數、row[8] 金額與 row[9] 筆數', () => {
    const mockTpex = {
      tables: [
        {
          data: [
            ['3260', '威剛', '365.0', '+5.0', '360.0', '368.0', '358.0', '5,620,000', '2,050,000,000', '3,958'],
          ],
        },
      ],
    };

    const res1 = parseTpexDailyQuotes(mockTpex, '2026-10-08');
    expect(res1['3260']).toBeDefined();
    expect(res1['3260'].transactions).toBe(3958);
    expect(res1['3260'].volume).toBe(5620000);

    const res2 = parseTpexDailyQuotesBulk(mockTpex, '2026-10-08');
    expect(res2['3260']).toBeDefined();
    expect(res2['3260'].transactions).toBe(3958);
    expect(res2['3260'].volume).toBe(5620000);
  });

  it('3. saveTwQuotesToSqlite 應將 transactions 正確寫入 daily_candles 且 ON CONFLICT DO UPDATE 更新', () => {
    const db = initSqliteLakehouseDb(TEST_DB_PATH);

    const mockQuotes = {
      '2330': {
        symbol: '2330',
        date: '2026-10-08',
        open: 1000,
        high: 1020,
        low: 995,
        close: 1015,
        volume: 45123456,
        transactions: 35888,
      },
      '3260': {
        symbol: '3260',
        date: '2026-10-08',
        open: 360,
        high: 368,
        low: 358,
        close: 365,
        volume: 5620000,
        transactions: 3958,
      },
    };

    // 第一次插入
    const { savedCount } = saveTwQuotesToSqlite(mockQuotes, TEST_DB_PATH);
    expect(savedCount).toBe(2);

    const row2330 = db.prepare('SELECT transactions, volume, close FROM daily_candles WHERE symbol = ? AND date = ?').get('2330', '2026-10-08');
    expect(row2330).toBeDefined();
    expect((row2330 as any).transactions).toBe(35888);
    expect((row2330 as any).volume).toBe(45123456);

    const row3260 = db.prepare('SELECT transactions, volume, close FROM daily_candles WHERE symbol = ? AND date = ?').get('3260', '2026-10-08');
    expect(row3260).toBeDefined();
    expect((row3260 as any).transactions).toBe(3958);
    expect((row3260 as any).volume).toBe(5620000);

    // 第二次更新（覆蓋更新）
    mockQuotes['3260'].transactions = 4001;
    saveTwQuotesToSqlite(mockQuotes, TEST_DB_PATH);

    const updated3260 = db.prepare('SELECT transactions FROM daily_candles WHERE symbol = ? AND date = ?').get('3260', '2026-10-08');
    expect((updated3260 as any).transactions).toBe(4001);
  });
});
