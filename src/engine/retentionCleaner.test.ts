import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  pruneExpiredCandles,
  pruneExpiredChips,
  runIncrementalVacuum,
} = require('../../scripts/market-sync/retention-cleaner.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 03 - 歷史數據滾動窗口修剪與增量 VACUUM (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_retention_history.db');

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

  it('1. 應能針對單檔標的精確修剪超過保留天數之日 K 記錄 (pruneExpiredCandles)', () => {
    initSqliteLakehouseDb(testDbPath);
    const db = getSqliteDbConnection(testDbPath);

    // 模擬注入 15 筆連續日期的日 K (2026-09-01 ~ 2026-09-15)
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 15; i++) {
      const d = `2026-09-${String(i).padStart(2, '0')}`;
      insertStmt.run('2330', d, 100 + i, 105 + i, 95 + i, 102 + i, 102 + i, 1000, 100000);
    }
    db.exec('COMMIT;');

    // 設定只保留最新 5 筆
    const pruneResult = pruneExpiredCandles('2330', 5, testDbPath);
    expect(pruneResult.deletedCandles).toBe(10);

    // 驗證剩餘 5 筆且均為最新日期 (2026-09-11 ~ 2026-09-15)
    const remaining = db
      .prepare('SELECT date FROM daily_candles WHERE symbol = ? ORDER BY date ASC')
      .all('2330');
    expect(remaining).toHaveLength(5);
    expect(remaining[0].date).toBe('2026-09-11');
    expect(remaining[4].date).toBe('2026-09-15');
  });

  it('2. 應能針對籌碼表記錄精確修剪 (pruneExpiredChips)', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 10; i++) {
      const d = `2026-09-${String(i).padStart(2, '0')}`;
      insertStmt.run('2330', d, 100, 50, -20);
    }
    db.exec('COMMIT;');

    // 保留最新 3 筆
    const pruneResult = pruneExpiredChips('2330', 3, testDbPath);
    expect(pruneResult.deletedChips).toBe(7);

    const remaining = db
      .prepare('SELECT date FROM tw_institutional_chips WHERE symbol = ? ORDER BY date ASC')
      .all('2330');
    expect(remaining).toHaveLength(3);
    expect(remaining[0].date).toBe('2026-09-08');
    expect(remaining[2].date).toBe('2026-09-10');
  });

  it('3. 當傳入空 symbol 時應能對全市場所有標的自動批次修剪', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 替 AAPL 與 NVDA 各注入 8 筆
    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 8; i++) {
      const d = `2026-08-${String(i).padStart(2, '0')}`;
      insertStmt.run('AAPL', d, 200, 205, 195, 202, 202, 5000);
      insertStmt.run('NVDA', d, 120, 125, 115, 122, 122, 8000);
    }
    db.exec('COMMIT;');

    // 全量修剪：保留最新 4 筆
    const result = pruneExpiredCandles(undefined, 4, testDbPath);
    expect(result.deletedCandles).toBeGreaterThanOrEqual(8);

    const aaplCount = db
      .prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?')
      .get('AAPL').cnt;
    const nvdaCount = db
      .prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?')
      .get('NVDA').cnt;

    expect(aaplCount).toBe(4);
    expect(nvdaCount).toBe(4);
  });

  it('4. 應能成功調用 runIncrementalVacuum 釋放空間且不噴錯', () => {
    const vacuumResult = runIncrementalVacuum(100, testDbPath);
    expect(vacuumResult.success).toBe(true);
  });
});
