import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  initSqliteLakehouseDb,
  closeSqliteDb,
  getSqliteDbConnection,
} = require('./sqlite-db-core.cjs');
const { saveTwQuotesToSqlite } = require('./ingest-tw-quotes.cjs');
const { saveTwT86ToSqlite } = require('./ingest-tw-t86.cjs');

const TEST_DB_PATH = path.resolve(__dirname, '../../.scratch/test_tw_lakehouse.db');

describe('Ticket 01: 台股每日同步與歷史數據寫入 SQLite 湖倉', () => {
  beforeEach(() => {
    closeSqliteDb();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {}
    }
  });

  afterEach(() => {
    closeSqliteDb();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {}
    }
  });

  it('應正確將台股 MI_INDEX 收盤行情寫入 daily_candles 表', () => {
    const quotes = {
      '2886': {
        symbol: '2886',
        date: '2026-10-01',
        open: 48.5,
        high: 49.2,
        low: 48.1,
        close: 48.85,
        adj_close: 48.85,
        volume: 30290000,
        turnover: 1478000000,
      },
      '2330': {
        symbol: '2330',
        date: '2026-10-01',
        open: 980,
        high: 995,
        low: 978,
        close: 990,
        adj_close: 990,
        volume: 25000000,
        turnover: 24600000000,
      },
    };

    const res = saveTwQuotesToSqlite(quotes, TEST_DB_PATH);
    expect(res.savedCount).toBe(2);

    const db = getSqliteDbConnection(TEST_DB_PATH);
    const row2886 = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').get('2886');
    expect(row2886).toBeDefined();
    expect(row2886.date).toBe('2026-10-01');
    expect(row2886.close).toBe(48.85);
    expect(row2886.volume).toBe(30290000);
  });

  it('應正確將台股 T86 三大法人買賣超寫入 tw_institutional_chips 表', () => {
    const t86Map = {
      '2886': {
        symbol: '2886',
        foreignNet: 1520,
        trustNet: -230,
        dealerNet: 140,
      },
      '2330': {
        symbol: '2330',
        foreignNet: 5600,
        trustNet: 820,
        dealerNet: -350,
      },
    };

    const res = saveTwT86ToSqlite(t86Map, '2026-10-01', TEST_DB_PATH);
    expect(res.savedCount).toBe(2);

    const db = getSqliteDbConnection(TEST_DB_PATH);
    const row2886 = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ?').get('2886');
    expect(row2886).toBeDefined();
    expect(row2886.date).toBe('2026-10-01');
    expect(row2886.foreign_net).toBe(1520);
    expect(row2886.trust_net).toBe(-230);
  });

  it('應正確將個股多日歷史 K 線數列寫入 daily_candles 表', () => {
    const { saveTwHistoryToSqlite } = require('./backfill-local-csv.cjs');
    const historyCandles = [
      { date: '2026-09-28', open: 48.0, high: 48.5, low: 47.8, close: 48.2, volume: 15000000 },
      { date: '2026-09-29', open: 48.2, high: 48.8, low: 48.0, close: 48.6, volume: 18000000 },
      { date: '2026-09-30', open: 48.5, high: 49.0, low: 48.3, close: 48.4, volume: 22000000 },
    ];

    const saved = saveTwHistoryToSqlite('2886', historyCandles, TEST_DB_PATH);
    expect(saved).toBe(3);

    const db = getSqliteDbConnection(TEST_DB_PATH);
    const rows = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date ASC').all('2886');
    expect(rows.length).toBe(3);
    expect(rows[0].date).toBe('2026-09-28');
    expect(rows[2].date).toBe('2026-09-30');
    expect(rows[2].close).toBe(48.4);
  });
});
