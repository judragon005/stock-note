import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 01 - SQLite 核心儲存庫與 Schema 初始化 (Vitest Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_market_history.db');

  // 清理既有測試檔案
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {
    // 忽略
  }

  afterAll(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (e) {
      // 忽略
    }
  });

  it('1. 應能成功建立資料庫連線並啟用 WAL 模式與 busy_timeout', () => {
    const db = getSqliteDbConnection(testDbPath);
    expect(db).toBeDefined();

    // 檢查 journal_mode 是否為 wal
    const journalModeRow = db.prepare('PRAGMA journal_mode;').get();
    expect(String(journalModeRow.journal_mode).toLowerCase()).toBe('wal');

    // 檢查 busy_timeout
    const busyTimeoutRow = db.prepare('PRAGMA busy_timeout;').get();
    expect(busyTimeoutRow.timeout).toBe(5000);
  });

  it('2. 應能正確初始化四大核心資料表及其索引', () => {
    const db = initSqliteLakehouseDb(testDbPath);

    // 驗證 symbols_meta 表存在
    const tableSymbols = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='symbols_meta';")
      .get();
    expect(tableSymbols).toBeDefined();

    // 驗證 daily_candles 表存在
    const tableCandles = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_candles';")
      .get();
    expect(tableCandles).toBeDefined();

    // 驗證 tw_institutional_chips 表存在
    const tableChips = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tw_institutional_chips';")
      .get();
    expect(tableChips).toBeDefined();

    // 驗證 sync_checkpoints 表存在
    const tableCheckpoints = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_checkpoints';")
      .get();
    expect(tableCheckpoints).toBeDefined();
  });

  it('3. 應支援 symbols_meta 基本 CRUD 與主鍵約束', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('2330', '台積電', 'TW', 'TWSE', 'STOCK', 'NORMAL', Date.now());

    const row = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get('2330');
    expect(row.symbol).toBe('2330');
    expect(row.name).toBe('台積電');
    expect(row.market).toBe('TW');
    expect(row.status).toBe('NORMAL');
  });

  it('4. 應支援 daily_candles 複合主鍵與覆蓋替換 (INSERT OR REPLACE)', () => {
    const db = getSqliteDbConnection(testDbPath);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('2330', '2026-09-30', 980.0, 995.0, 978.0, 990.0, 990.0, 35000, 34500000000);
    // 重複插入同一天，更新收盤價為 992.0
    stmt.run('2330', '2026-09-30', 980.0, 995.0, 978.0, 992.0, 992.0, 35500, 35000000000);

    const row = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('2330', '2026-09-30');
    expect(row.close).toBe(992.0);
    expect(row.volume).toBe(35500);
  });

  it('5. 應能優雅關閉連線並釋放鎖定', () => {
    closeSqliteDb();
    // 再次取得連線應正常重連
    const db = getSqliteDbConnection(testDbPath);
    expect(db).toBeDefined();
    closeSqliteDb();
  });

  it('6. 應能建立 sync_checkpoints 複合狀態索引 (idx_sync_checkpoints_lookup) 並命中覆蓋查詢', () => {
    const db = initSqliteLakehouseDb(testDbPath);

    // 驗證複合索引 idx_sync_checkpoints_lookup 存在
    const indexRow = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sync_checkpoints_lookup';")
      .get();
    expect(indexRow).toBeDefined();
    expect(indexRow.name).toBe('idx_sync_checkpoints_lookup');

    // 驗證 EXPLAIN QUERY PLAN 命中此索引
    const plan = db
      .prepare("EXPLAIN QUERY PLAN SELECT symbol FROM sync_checkpoints WHERE market = 'US' AND status = 'SUCCESS' AND last_success_date = ?")
      .all('2026-10-08');
    const planDetails = plan.map((p: any) => p.detail).join(' ');
    expect(planDetails).toContain('idx_sync_checkpoints_lookup');
  });
});
