import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 01 - SQLite 湖倉結構擴展與覆蓋索引 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_schema_expansion.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('1. initSqliteLakehouseDb 應能成功建立 tw_tdcc_distribution 與 tw_monthly_revenue', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    
    const db = initSqliteLakehouseDb(testDbPath);
    expect(db).toBeDefined();

    // 驗證 tw_tdcc_distribution 存在
    const tdccCols = db.prepare("PRAGMA table_info('tw_tdcc_distribution')").all();
    const colNames = tdccCols.map((c: any) => c.name);
    expect(colNames).toContain('symbol');
    expect(colNames).toContain('date');
    expect(colNames).toContain('total_shareholders');
    expect(colNames).toContain('over_400_ratio');
    expect(colNames).toContain('over_1000_ratio');
    expect(colNames).toContain('under_10_ratio');
    expect(colNames).toContain('updated_at');

    // 驗證 tw_monthly_revenue 存在
    const revCols = db.prepare("PRAGMA table_info('tw_monthly_revenue')").all();
    const revNames = revCols.map((c: any) => c.name);
    expect(revNames).toContain('symbol');
    expect(revNames).toContain('year_month');
    expect(revNames).toContain('revenue');
    expect(revNames).toContain('last_year_revenue');
    expect(revNames).toContain('yoy_rate');
    expect(revNames).toContain('mom_rate');
    expect(revNames).toContain('is_all_time_high');
    expect(revNames).toContain('updated_at');

    // 驗證索引存在
    const indices = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((i: any) => i.name);
    expect(indices).toContain('idx_tdcc_symbol_date');
    expect(indices).toContain('idx_revenue_symbol');

    closeSqliteDb();
  });

  it('2. DDL 應具備冪等性，重複呼叫 initSqliteLakehouseDb 不會拋出異常', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    
    expect(() => {
      initSqliteLakehouseDb(testDbPath);
      initSqliteLakehouseDb(testDbPath);
    }).not.toThrow();

    closeSqliteDb();
  });
});
