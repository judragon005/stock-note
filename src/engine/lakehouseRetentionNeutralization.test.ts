// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  pruneExpiredCandles,
  pruneExpiredChips,
  runFullRetentionMaintenance,
} from '../../scripts/market-sync/retention-cleaner.cjs';
import {
  initSqliteLakehouseDb,
  getSqliteDbConnection,
  closeSqliteDb,
} from '../../scripts/market-sync/sqlite-db-core.cjs';

describe('Spec 0188 / Ticket 02: 歷史修剪器安全封印 (TDD: Red)', () => {
  const testDbDir = path.resolve(process.cwd(), '.scratch/test-lakehouse-deep');
  let testDbPath = '';

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.join(testDbDir, `test_retention_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`);
    initSqliteLakehouseDb(testDbPath);
  });

  afterEach(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  it('1. pruneExpiredCandles 應永久封印刪除行為，不再刪除超過指定天數之日 K 記錄 (保護全歷史)', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 30; i++) {
      const d = `2026-08-${String(i).padStart(2, '0')}`;
      insertStmt.run('2330', d, 100, 105, 95, 102, 102, 1000, 100000);
    }
    db.exec('COMMIT;');

    // 即使呼叫 pruneExpiredCandles 要求只留 5 筆，也應封印刪除，返回 deletedCandles: 0
    const result = pruneExpiredCandles('2330', 5, testDbPath);
    expect(result.deletedCandles).toBe(0);

    // 驗證 30 筆日 K 100% 完整保留
    const remaining = db.prepare('SELECT count(*) as c FROM daily_candles WHERE symbol = ?').get('2330');
    expect(remaining.c).toBe(30);
  });

  it('2. pruneExpiredChips 應永久封印刪除行為，不再刪除籌碼表記錄 (保護全歷史籌碼)', () => {
    const db = getSqliteDbConnection(testDbPath);
    const insertStmt = db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 20; i++) {
      const d = `2026-08-${String(i).padStart(2, '0')}`;
      insertStmt.run('2330', d, 100, 50, -20);
    }
    db.exec('COMMIT;');

    // 封印刪除，返回 deletedChips: 0
    const result = pruneExpiredChips('2330', 5, testDbPath);
    expect(result.deletedChips).toBe(0);

    // 驗證 20 筆籌碼 100% 完整保留
    const remaining = db.prepare('SELECT count(*) as c FROM tw_institutional_chips WHERE symbol = ?').get('2330');
    expect(remaining.c).toBe(20);
  });

  it('3. runFullRetentionMaintenance 全量維護任務執行時，不應刪除任何歷史日 K 與籌碼', () => {
    const db = getSqliteDbConnection(testDbPath);
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('2330', '2020-01-02', 100, 105, 95, 102, 102, 1000, 100000);

    const report = runFullRetentionMaintenance(testDbPath);
    expect(report.deletedCandles).toBe(0);
    expect(report.deletedChips).toBe(0);

    const remaining = db.prepare('SELECT count(*) as c FROM daily_candles WHERE symbol = ?').get('2330');
    expect(remaining.c).toBe(1);
  });
});
