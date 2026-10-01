import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  parseTwseSbl,
  parseTwseMargin,
  parseTwseDayTrade,
  saveTwExtendedChipsToSqlite,
} = require('../../scripts/market-sync/ingest-tw-extended-chips.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 06 - 台股借券賣出 SBL、信用交易與當沖資料入庫 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_extended_chips.db');

  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}

  afterAll(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (e) {}
  });

  it('1. 應能準確解析 TWSE TWT93U 借券賣出餘額 (parseTwseSbl)', () => {
    const mockSblRaw = {
      stat: 'OK',
      data: [
        ['2330', '台積電', '100,000', '20,000', '10,000', '110,000', '1,000,000'],
        ['0050', '元大台灣50', '50,000', '5,000', '2,000', '53,000', '500,000'],
      ],
    };

    const parsed = parseTwseSbl(mockSblRaw);
    expect(parsed['2330']).toBeDefined();
    expect(parsed['2330'].sblBalance).toBe(110000);
    expect(parsed['0050'].sblBalance).toBe(53000);
  });

  it('2. 應能準確解析 TWSE MI_MARGN 融資融券餘額 (parseTwseMargin)', () => {
    const mockMarginRaw = {
      tables: [
        {
          data: [
            ['2330', '台積電', '10,000', '2,000', '1,000', '11,000', '500', '100', '50', '550'],
          ],
        },
      ],
    };

    const parsed = parseTwseMargin(mockMarginRaw);
    expect(parsed['2330']).toBeDefined();
    expect(parsed['2330'].marginBalance).toBe(11000);
    expect(parsed['2330'].shortBalance).toBe(550);
  });

  it('3. 應能準確解析 TWSE TWTB4U 當沖比率 (parseTwseDayTrade)', () => {
    const mockDayTradeRaw = {
      data: [
        ['2330', '台積電', '35,000,000', '3,500,000', '10.00'],
        ['2603', '長榮', '80,000,000', '32,000,000', '40.00'],
      ],
    };

    const parsed = parseTwseDayTrade(mockDayTradeRaw);
    expect(parsed['2330']).toBeDefined();
    expect(parsed['2330'].dayTradeRate).toBe(10.0);
    expect(parsed['2603'].dayTradeRate).toBe(40.0);
  });

  it('4. 應支援借券賣出、融資券與當沖數據批次回寫 SQLite (saveTwExtendedChipsToSqlite)', () => {
    initSqliteLakehouseDb(testDbPath);
    const db = getSqliteDbConnection(testDbPath);

    // 先插入一筆基本記錄
    db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, ?, ?, ?)
    `).run('2330', '2026-09-30', 5000, 1500, -500);

    const extMap = {
      '2330': {
        symbol: '2330',
        sblBalance: 110000,
        marginBalance: 11000,
        shortBalance: 550,
        dayTradeRate: 10.0,
      },
    };

    const result = saveTwExtendedChipsToSqlite(extMap, '2026-09-30', testDbPath);
    expect(result.savedCount).toBe(1);

    const row = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('2330', '2026-09-30');
    expect(row.sbl_balance).toBe(110000);
    expect(row.margin_balance).toBe(11000);
    expect(row.short_balance).toBe(550);
    expect(row.day_trade_rate).toBe(10.0);
    // 確認原本的法人數據保留未被覆蓋為 0
    expect(row.foreign_net).toBe(5000);
  });
});
