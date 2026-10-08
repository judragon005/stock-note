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

  it('1. runTdccIngestion 應能對註冊台股標的批次生成並入庫 TDCC 股權分散表', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runTdccIngestion } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2454', '聯發科', 'TW', 12345)").run();

    const { savedCount, targetDate } = await runTdccIngestion(testDbPath, '2026-10-02');
    expect(savedCount).toBe(2);
    expect(targetDate).toBe('2026-10-02');

    const rows = db.prepare("SELECT * FROM tw_tdcc_distribution WHERE date = '2026-10-02'").all();
    expect(rows.length).toBe(2);
    expect(rows[0].over_1000_ratio).toBeGreaterThan(0);

    closeSqliteDb();
  });

  it('2. runMonthlyRevenueIngestion 應能對註冊台股標的批次生成並入庫月營收與年增率', async () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { runMonthlyRevenueIngestion } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT OR REPLACE INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2454', '聯發科', 'TW', 12345)").run();

    const { savedCount, yearMonth } = await runMonthlyRevenueIngestion(testDbPath, '2026-08');
    expect(savedCount).toBe(2);
    expect(yearMonth).toBe('2026-08');

    const rows = db.prepare("SELECT * FROM tw_monthly_revenue WHERE year_month = '2026-08'").all();
    expect(rows.length).toBe(2);
    expect(rows[0].revenue).toBeGreaterThan(0);

    closeSqliteDb();
  });
});
