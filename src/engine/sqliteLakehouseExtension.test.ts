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

  it('2. Spec 0183 (Ticket 01): 應成功建立 etf_daily_nav 並支援期貨 OI 與融券回補日欄位', () => {
    if (!sqliteDbCore.isSqliteSupported()) {
      return;
    }

    const db = sqliteDbCore.initSqliteLakehouseDb(testDbPath);
    expect(db).toBeTruthy();

    // 測試寫入 etf_daily_nav
    const etfStmt = db.prepare(`
      INSERT INTO etf_daily_nav (symbol, date, close_price, nav, premium_discount_ratio, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    etfStmt.run('0050', '2026-10-15', 165.5, 164.8, 0.42, Date.now());

    const etfRow = db.prepare('SELECT * FROM etf_daily_nav WHERE symbol = ? AND date = ?').get('0050', '2026-10-15');
    expect(etfRow).toBeTruthy();
    expect(etfRow.close_price).toBe(165.5);
    expect(etfRow.nav).toBe(164.8);
    expect(etfRow.premium_discount_ratio).toBe(0.42);

    // 測試 macro_sentiment_daily 擴充欄位 (外資期貨淨留倉)
    const macroOiStmt = db.prepare(`
      INSERT INTO macro_sentiment_daily (date, tw_foreign_futures_oi, tw_trust_futures_oi, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        tw_foreign_futures_oi = excluded.tw_foreign_futures_oi,
        tw_trust_futures_oi = excluded.tw_trust_futures_oi
    `);
    macroOiStmt.run('2026-10-15', -38500, 24000, Date.now());

    const macroOiRow = db.prepare('SELECT tw_foreign_futures_oi, tw_trust_futures_oi FROM macro_sentiment_daily WHERE date = ?').get('2026-10-15');
    expect(macroOiRow.tw_foreign_futures_oi).toBe(-38500);
    expect(macroOiRow.tw_trust_futures_oi).toBe(24000);

    // 測試 corporate_action_calendar 融券最後回補日與過戶停牌
    const caHaltStmt = db.prepare(`
      INSERT INTO corporate_action_calendar (symbol, market, action_type, ex_date, mandatory_buyback_date, halt_start_date, halt_end_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    caHaltStmt.run('2330', 'TW', 'DIVIDEND', '2026-06-18', '2026-06-10', '2026-06-12', '2026-06-16', Date.now());

    const caHaltRow = db.prepare('SELECT mandatory_buyback_date, halt_start_date, halt_end_date FROM corporate_action_calendar WHERE symbol = ? AND ex_date = ?').get('2330', '2026-06-18');
    expect(caHaltRow.mandatory_buyback_date).toBe('2026-06-10');
    expect(caHaltRow.halt_start_date).toBe('2026-06-12');
    expect(caHaltRow.halt_end_date).toBe('2026-06-16');
  });
});
