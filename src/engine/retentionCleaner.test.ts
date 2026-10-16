import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  pruneExpiredCandles,
  pruneExpiredChips,
  runIncrementalVacuum,
  runFullRetentionMaintenance,
} = require('../../scripts/market-sync/retention-cleaner.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 03 / Spec 0188 - 歷史數據滾動視窗修剪安全封印與增量 VACUUM (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_retention_history.db');

  // 清理既有測試檔案
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {
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
    } catch {
      // 忽略
    }
  });

  it('1. 應封印日 K 記錄刪除以守護全歷史 (pruneExpiredCandles 回傳 0 刪除)', () => {
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

    // 設定只保留最新 5 筆，但安全封印後應 0 刪除
    const pruneResult = pruneExpiredCandles('2330', 5, testDbPath);
    expect(pruneResult.deletedCandles).toBe(0);
    expect(pruneResult.protected).toBe(true);

    // 驗證 15 筆日 K 完整保留
    const remaining = db
      .prepare('SELECT date FROM daily_candles WHERE symbol = ? ORDER BY date ASC')
      .all('2330');
    expect(remaining).toHaveLength(15);
  });

  it('2. 應封印籌碼記錄刪除以守護全歷史籌碼 (pruneExpiredChips 回傳 0 刪除)', () => {
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

    const pruneResult = pruneExpiredChips('2330', 3, testDbPath);
    expect(pruneResult.deletedChips).toBe(0);
    expect(pruneResult.protected).toBe(true);

    const remaining = db
      .prepare('SELECT date FROM tw_institutional_chips WHERE symbol = ? ORDER BY date ASC')
      .all('2330');
    expect(remaining).toHaveLength(10);
  });

  it('3. 當傳入空 symbol 時全市場批量修剪亦應守護歷史 0 刪除', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 8; i++) {
      const d = `2026-08-${String(i).padStart(2, '0')}`;
      insertStmt.run('AAPL', d, 200, 205, 195, 202, 202, 5000);
      insertStmt.run('NVDA', d, 120, 125, 115, 122, 122, 8000);
    }
    db.exec('COMMIT;');

    const result = pruneExpiredCandles(undefined, 4, testDbPath);
    expect(result.deletedCandles).toBe(0);

    const aaplCount = db
      .prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?')
      .get('AAPL').cnt;
    const nvdaCount = db
      .prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?')
      .get('NVDA').cnt;

    expect(aaplCount).toBe(8);
    expect(nvdaCount).toBe(8);
  });

  it('4. 應能成功調用 runIncrementalVacuum 釋放空間且不噴錯', () => {
    const vacuumResult = runIncrementalVacuum(100, testDbPath);
    expect(vacuumResult.success).toBe(true);
  });

  it('5. runFullRetentionMaintenance 應能安全完成整理並確認 0 刪除', () => {
    const report = runFullRetentionMaintenance(testDbPath);
    expect(report.deletedCandles).toBe(0);
    expect(report.deletedChips).toBe(0);
    expect(report.vacuum).toBe(true);
  });
});
