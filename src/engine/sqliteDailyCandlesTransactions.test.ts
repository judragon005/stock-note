import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Spec 0168 / Ticket 02: daily_candles transactions 欄位', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_candles_transactions.db');
  let core: any;

  const cleanup = () => {
    for (const suffix of ['', '-wal', '-shm']) {
      const p = testDbPath + suffix;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  };

  beforeEach(() => {
    core = require('../../scripts/market-sync/sqlite-db-core.cjs');
    core.closeSqliteDb();
    cleanup();
  });

  afterEach(() => {
    core.closeSqliteDb();
    cleanup();
  });

  const columnNames = (db: any): string[] =>
    db.prepare('PRAGMA table_info(daily_candles)').all().map((c: any) => c.name);

  it('1. 全新資料庫的 daily_candles 應包含 transactions 欄位，且可寫入與讀回', () => {
    if (!core.isSqliteSupported()) return;
    const db = core.initSqliteLakehouseDb(testDbPath);
    expect(columnNames(db)).toContain('transactions');

    db.prepare(
      'INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('00411A', '2026-10-02', 10.79, 10.79, 10.68, 10.71, 10.71, 9935014, null, 4321);

    const row = db.prepare('SELECT transactions FROM daily_candles WHERE symbol = ?').get('00411A');
    expect(row.transactions).toBe(4321);
  });

  it('2. 未提供 transactions 的既有寫入路徑應得到 NULL (不得偽造)', () => {
    if (!core.isSqliteSupported()) return;
    const db = core.initSqliteLakehouseDb(testDbPath);
    db.prepare(
      'INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('2330', '2026-10-02', 1, 2, 0.5, 1.5, 1.5, 1000, null);

    const row = db.prepare('SELECT transactions FROM daily_candles WHERE symbol = ?').get('2330');
    expect(row.transactions).toBeNull();
  });

  it('3. 舊版資料庫 (無 transactions 欄位) 初始化後應無損遷移，既有資料完整保留', () => {
    if (!core.isSqliteSupported()) return;
    const legacy = core.getSqliteDbConnection(testDbPath);
    legacy.exec(`
      CREATE TABLE daily_candles (
        symbol TEXT NOT NULL, date TEXT NOT NULL,
        open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL, close REAL NOT NULL,
        adj_close REAL NOT NULL, volume REAL NOT NULL, turnover REAL,
        PRIMARY KEY (symbol, date)
      );
    `);
    legacy.prepare(
      'INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('0050', '2026-10-02', 60, 61, 59, 60.5, 60.5, 68606769, null);
    expect(columnNames(legacy)).not.toContain('transactions');
    core.closeSqliteDb();

    const db = core.initSqliteLakehouseDb(testDbPath);
    expect(columnNames(db)).toContain('transactions');
    const row = db.prepare('SELECT close, volume, transactions FROM daily_candles WHERE symbol = ?').get('0050');
    expect(row.close).toBe(60.5);
    expect(row.volume).toBe(68606769);
    expect(row.transactions).toBeNull();
  });

  it('4. 重複初始化 (冪等) 不得因欄位已存在而拋錯', () => {
    if (!core.isSqliteSupported()) return;
    core.initSqliteLakehouseDb(testDbPath);
    expect(() => core.initSqliteLakehouseDb(testDbPath)).not.toThrow();
    const db = core.initSqliteLakehouseDb(testDbPath);
    expect(columnNames(db).filter((n) => n === 'transactions')).toHaveLength(1);
  });
});
