// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';


const require = createRequire(import.meta.url);
const {
  getSqliteDbConnection,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');
const { saveTwQuotesToSqlite } = require('../../scripts/market-sync/ingest-tw-quotes.cjs');
const { saveTwT86ToSqlite } = require('../../scripts/market-sync/ingest-tw-t86.cjs');

describe('Ticket 01: 台股每日同步與歷史數據寫入 SQLite 本地湖倉 (SQLite Lakehouse TW Ingestion)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_tw_lakehouse.db');

  beforeEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  afterEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  it('1. saveTwQuotesToSqlite 應能將台股收盤行情批次寫入 daily_candles 且支援 UPSERT 覆蓋', () => {
    const mockQuotes = {
      '2886': {
        symbol: '2886',
        date: '2026-10-01',
        open: 48.5,
        high: 49.0,
        low: 48.2,
        close: 48.45,
        adj_close: 48.45,
        volume: 25000000,
        turnover: 1210000000,
      },
      '2330': {
        symbol: '2330',
        date: '2026-10-01',
        open: 1000,
        high: 1020,
        low: 995,
        close: 1015,
        adj_close: 1015,
        volume: 45000000,
        turnover: 45000000000,
      },
    };

    const res = saveTwQuotesToSqlite(mockQuotes, testDbPath);
    expect(res.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    const row2886 = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('2886', '2026-10-01');
    expect(row2886).toBeDefined();
    expect(row2886.close).toBe(48.45);
    expect(row2886.volume).toBe(25000000);

    // 測試 UPSERT 覆蓋
    const updatedQuotes = {
      '2886': {
        symbol: '2886',
        date: '2026-10-01',
        open: 48.5,
        high: 49.0,
        low: 48.2,
        close: 48.8, // 修正價
        adj_close: 48.8,
        volume: 25100000,
        turnover: 1215000000,
      },
    };
    saveTwQuotesToSqlite(updatedQuotes, testDbPath);
    const recheck2886 = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('2886', '2026-10-01');
    expect(recheck2886.close).toBe(48.8);
    expect(recheck2886.volume).toBe(25100000);
  });

  it('2. saveTwT86ToSqlite 應能將台股三大法人籌碼批次寫入 tw_institutional_chips', () => {
    const mockT86 = {
      '2886': {
        symbol: '2886',
        foreignNet: 1500,
        trustNet: 200,
        dealerNet: -50,
      },
      '2330': {
        symbol: '2330',
        foreignNet: -3500,
        trustNet: 1200,
        dealerNet: 150,
      },
    };

    const res = saveTwT86ToSqlite(mockT86, '2026-10-01', testDbPath);
    expect(res.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    const chip2886 = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('2886', '2026-10-01');
    expect(chip2886).toBeDefined();
    expect(chip2886.foreign_net).toBe(1500);
    expect(chip2886.trust_net).toBe(200);
    expect(chip2886.dealer_net).toBe(-50);
  });

  it('3. saveAlignedCandlesBatchToSqlite 應能將全市場多檔股票歷史日 K 數列批次寫入 daily_candles', () => {
    const { saveAlignedCandlesBatchToSqlite } = require('../../scripts/market-sync/backfill-local-csv.cjs');
    const mockCompactMap = {
      '2886': [
        { d: '2026-09-29', o: 48.0, h: 48.5, l: 47.8, c: 48.2, v: 21000000 },
        { d: '2026-09-30', o: 48.2, h: 48.8, l: 48.0, c: 48.5, v: 22000000 },
      ],
      '2330': [
        { d: '2026-09-29', o: 990, h: 1005, l: 985, c: 1000, v: 30000000 },
        { d: '2026-09-30', o: 1000, h: 1015, l: 995, c: 1010, v: 35000000 },
      ],
    };

    const count = saveAlignedCandlesBatchToSqlite(mockCompactMap, testDbPath);
    expect(count).toBe(4);

    const db = getSqliteDbConnection(testDbPath);
    const rows = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date ASC').all('2886');
    expect(rows.length).toBe(2);
    expect(rows[0].date).toBe('2026-09-29');
    expect(rows[0].close).toBe(48.2);
    expect(rows[1].date).toBe('2026-09-30');
    expect(rows[1].close).toBe(48.5);
  });
});

