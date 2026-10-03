import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 08 - 湖倉全光譜審計驗證器與排程閉環 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_audit_full.db');

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

  it('1. auditFullLakehouseSpectrum 應能產出包含 6 大核心表之完整審計報表', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { auditFullLakehouseSpectrum } = require('../../scripts/market-sync/audit-verifier.cjs');

    const db = initSqliteLakehouseDb(testDbPath);

    // 塞入基本測試資料
    db.prepare("INSERT INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES ('2330', '2026-10-02', 100, 105, 99, 102, 102, 1000)").run();
    db.prepare("INSERT INTO tw_institutional_chips (symbol, date, foreign_net) VALUES ('2330', '2026-10-02', 500)").run();
    db.prepare("INSERT INTO tw_tdcc_distribution (symbol, date, total_shareholders, over_1000_ratio, updated_at) VALUES ('2330', '2026-10-02', 1000000, 80.5, 12345)").run();
    db.prepare("INSERT INTO tw_monthly_revenue (symbol, year_month, revenue, yoy_rate, updated_at) VALUES ('2330', '2026-09', 250000, 30.2, 12345)").run();

    const report = auditFullLakehouseSpectrum(testDbPath);
    expect(report).toBeDefined();
    expect(report.totalSymbols).toBeGreaterThanOrEqual(1);
    expect(report.tables.dailyCandles).toBeGreaterThanOrEqual(1);
    expect(report.tables.chips).toBeGreaterThanOrEqual(1);
    expect(report.tables.tdcc).toBeGreaterThanOrEqual(1);
    expect(report.tables.revenue).toBeGreaterThanOrEqual(1);
    expect(report.status).toBe('HEALTHY');

    closeSqliteDb();
  });

  it('2. auditTwLakehouseUniverse 應能準確稽核台股註冊數、籌碼歷史區間與日 K 狀況', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { auditTwLakehouseUniverse } = require('../../scripts/market-sync/audit-verifier.cjs');

    const db = initSqliteLakehouseDb(testDbPath);
    db.prepare("INSERT INTO symbols_meta (symbol, name, market, updated_at) VALUES ('2330', '台積電', 'TW', 12345)").run();
    db.prepare("INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES ('2330', '2026-10-02', 100, 105, 99, 102, 102, 1000)").run();
    db.prepare("INSERT INTO tw_institutional_chips (symbol, date, foreign_net) VALUES ('2330', '2026-10-02', 500)").run();

    const twAudit = auditTwLakehouseUniverse('2026-10-03', testDbPath);
    expect(twAudit).toBeDefined();
    expect(twAudit.market).toBe('TW');
    expect(twAudit.totalTwRegistered).toBe(1);
    expect(twAudit.totalChips).toBe(1);
    expect(twAudit.chipsMaxDate).toBe('2026-10-02');
    expect(twAudit.status).toBe('HEALTHY_UNIVERSE');

    closeSqliteDb();
  });
});
