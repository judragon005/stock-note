import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');

const { runBootstrapFull } = require('../../scripts/market-sync/bootstrap-lakehouse-full.cjs');
const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

const testDbPath = path.resolve(__dirname, '../../.scratch/test_bootstrap.db');

describe('bootstrap-lakehouse-full - TDD Unit Tests', () => {
  beforeEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('1. runBootstrapFull 應能將估值、除權息、宏觀與質押成功寫入目標資料庫', async () => {
    const res = await runBootstrapFull(testDbPath);
    expect(res).toBeDefined();

    const db = initSqliteLakehouseDb(testDbPath);

    // 驗證 1217 估值存在
    const val1217 = db.prepare('SELECT * FROM tw_valuation_daily WHERE symbol = ?').get('1217');
    expect(val1217).toBeDefined();
    expect(val1217.pe).toBeGreaterThan(0);
    expect(val1217.dividend_yield).toBeGreaterThan(0);

    // 驗證宏觀情緒表不為空
    const macro = db.prepare('SELECT * FROM macro_sentiment_daily WHERE date = ?').get('2026-10-20');
    expect(macro).toBeDefined();
    expect(macro.treasury_yield_10y).toBe(4.12);

    // 驗證董監質押表不為空
    const pledge = db.prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol = ?').get('1217');
    expect(pledge).toBeDefined();
    expect(pledge.pledge_ratio).toBe(7.8);
  }, 15000);
});
