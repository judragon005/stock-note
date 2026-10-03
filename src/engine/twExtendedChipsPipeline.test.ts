import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 04 - 台股擴展籌碼 (資券/SBL/當沖) 每日同步整合 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_extended_chips_pipeline.db');

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

  it('1. saveTwExtendedChipsToSqlite 與 saveTwT86ToSqlite 應能完整合流同一日期同一標的', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { saveTwT86ToSqlite } = require('../../scripts/market-sync/ingest-tw-t86.cjs');
    const { saveTwExtendedChipsToSqlite } = require('../../scripts/market-sync/ingest-tw-extended-chips.cjs');

    const db = initSqliteLakehouseDb(testDbPath);

    // 先寫入 T86
    saveTwT86ToSqlite({
      '2330': { symbol: '2330', foreignNet: -5914, trustNet: 254, dealerNet: 317 }
    }, '2026-10-02', testDbPath);

    // 再合流入庫擴展籌碼 (資券, SBL, 當沖)
    saveTwExtendedChipsToSqlite({
      '2330': {
        symbol: '2330',
        marginBalance: 28060,
        shortBalance: 36,
        sblBalance: 4500000,
        dayTradeRate: 15.6,
      }
    }, '2026-10-02', testDbPath);

    const row = db.prepare("SELECT * FROM tw_institutional_chips WHERE symbol = '2330' AND date = '2026-10-02'").get() as any;
    expect(row).toBeDefined();
    // 驗證 T86 數值未被覆蓋為 null
    expect(row.foreign_net).toBe(-5914);
    expect(row.trust_net).toBe(254);
    expect(row.dealer_net).toBe(317);
    // 驗證擴展籌碼正確寫入
    expect(row.margin_balance).toBe(28060);
    expect(row.short_balance).toBe(36);
    expect(row.sbl_balance).toBe(4500000);
    expect(row.day_trade_rate).toBe(15.6);

    closeSqliteDb();
  });
});
