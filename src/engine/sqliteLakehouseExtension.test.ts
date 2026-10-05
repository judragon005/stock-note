import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 10: SQLite Lakehouse Extended Schema', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_extended_schema.db');
  let sqliteDbCore: any;

  beforeEach(() => {
    sqliteDbCore = require('../../scripts/market-sync/sqlite-db-core.cjs');
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    if (sqliteDbCore && sqliteDbCore.closeSqliteDb) {
      sqliteDbCore.closeSqliteDb();
    }
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('1. initSqliteLakehouseDb 應成功建立 corporate_action_calendar, tw_insider_pledge_records 與 macro_sentiment_daily 表', () => {
    if (!sqliteDbCore.isSqliteSupported()) {
      return; // 略過非 Node 22+ 環境
    }

    const db = sqliteDbCore.initSqliteLakehouseDb(testDbPath);
    expect(db).toBeTruthy();

    // 測試寫入 corporate_action_calendar
    const caStmt = db.prepare(`
      INSERT INTO corporate_action_calendar (symbol, market, action_type, ex_date, payment_date, cash_dividend_per_share, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    caStmt.run('2330', 'TW', 'DIVIDEND', '2026-03-18', '2026-04-10', 4.5, Date.now());

    const caRow = db.prepare('SELECT * FROM corporate_action_calendar WHERE symbol = ?').get('2330');
    expect(caRow.cash_dividend_per_share).toBe(4.5);
    expect(caRow.action_type).toBe('DIVIDEND');

    // 測試寫入 tw_insider_pledge_records
    const pledgeStmt = db.prepare(`
      INSERT INTO tw_insider_pledge_records (symbol, report_date, pledged_shares, total_director_shares, pledge_ratio, insider_transfer_shares, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    pledgeStmt.run('2330', '2026-02', 5000000, 100000000, 5.0, 0, Date.now());

    const pledgeRow = db.prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol = ?').get('2330');
    expect(pledgeRow.pledge_ratio).toBe(5.0);

    // 測試寫入 macro_sentiment_daily
    const macroStmt = db.prepare(`
      INSERT INTO macro_sentiment_daily (date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y, cnn_fear_greed_score, vix_close, tw_put_call_ratio, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    macroStmt.run('2026-10-02', 4.35, 4.12, -0.23, 65.5, 16.8, 108.2, Date.now());

    const macroRow = db.prepare('SELECT * FROM macro_sentiment_daily WHERE date = ?').get('2026-10-02');
    expect(macroRow.risk_free_rate_3m).toBe(4.35);
    expect(macroRow.cnn_fear_greed_score).toBe(65.5);
  });
});
