import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  parseTwseDailyQuotes,
  parseTpexDailyQuotes,
  saveTwQuotesToSqlite,
} = require('../../scripts/market-sync/ingest-tw-quotes.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 04 - 台股官方 TWSE/TPEx 收盤日 K 批次入庫 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_ingest_quotes.db');

  // 清理既有測試檔案
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {
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
    } catch (e) {
      // 忽略
    }
  });

  it('1. 應能準確解析 TWSE 官方 MI_INDEX 封包格式 (parseTwseDailyQuotes)', () => {
    const mockTwseRaw = {
      stat: 'OK',
      date: '20260930',
      tables: [
        {
          data: [
            ['2330', '台積電', '35,000,000', '12,000', '34,500,000,000', '980.00', '995.00', '978.00', '990.00', '+', '10.00'],
            ['0050', '元大台灣50', '8,000,000', '5,000', '1,500,000,000', '194.00', '196.50', '193.50', '195.00', '+', '1.00'],
          ],
        },
      ],
    };

    const parsed = parseTwseDailyQuotes(mockTwseRaw, '2026-09-30');
    expect(parsed['2330']).toBeDefined();
    expect(parsed['2330'].open).toBe(980.0);
    expect(parsed['2330'].high).toBe(995.0);
    expect(parsed['2330'].low).toBe(978.0);
    expect(parsed['2330'].close).toBe(990.0);
    expect(parsed['2330'].volume).toBe(35000000);
    expect(parsed['2330'].date).toBe('2026-09-30');

    expect(parsed['0050'].close).toBe(195.0);
  });

  it('2. 應能準確解析 TPEx 官方上櫃行情封包格式 (parseTpexDailyQuotes)', () => {
    const mockTpexRaw = {
      tables: [
        {
          data: [
            ['6547', '高端疫苗', '58.50', '+', '0.50', '58.00', '59.00', '57.80', '1,500,000', '87,000,000'],
            ['2755', '揚秦', '120.00', '+', '2.00', '118.00', '121.00', '118.00', '250,000', '30,000,000'],
          ],
        },
      ],
    };

    const parsed = parseTpexDailyQuotes(mockTpexRaw, '2026-09-30');
    expect(parsed['6547']).toBeDefined();
    expect(parsed['6547'].close).toBe(58.5);
    expect(parsed['6547'].open).toBe(58.0);
    expect(parsed['6547'].high).toBe(59.0);
    expect(parsed['6547'].low).toBe(57.8);
    expect(parsed['6547'].volume).toBe(1500000);
    expect(parsed['2755'].close).toBe(120.0);
  });

  it('3. 應支援整包收盤日 K 事務批次寫入 SQLite 且具備冪等性 (saveTwQuotesToSqlite)', () => {
    initSqliteLakehouseDb(testDbPath);
    const quotesMap = {
      '2330': {
        symbol: '2330',
        date: '2026-09-30',
        open: 980.0,
        high: 995.0,
        low: 978.0,
        close: 990.0,
        adj_close: 990.0,
        volume: 35000000,
        turnover: 34500000000,
      },
      '0050': {
        symbol: '0050',
        date: '2026-09-30',
        open: 194.0,
        high: 196.5,
        low: 193.5,
        close: 195.0,
        adj_close: 195.0,
        volume: 8000000,
        turnover: 1500000000,
      },
    };

    const result = saveTwQuotesToSqlite(quotesMap, testDbPath);
    expect(result.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    const row = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('2330', '2026-09-30');
    expect(row.close).toBe(990.0);
    expect(row.volume).toBe(35000000);

    // 重複寫入同一天，驗證冪等替換無異常
    quotesMap['2330'].close = 992.0;
    const updateResult = saveTwQuotesToSqlite(quotesMap, testDbPath);
    expect(updateResult.savedCount).toBe(2);

    const updatedRow = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('2330', '2026-09-30');
    expect(updatedRow.close).toBe(992.0);
  });

  it('4. 遇空封包或非交易日數據時應安全回傳空集合，不導致程式崩潰', () => {
    expect(parseTwseDailyQuotes(null, '2026-09-30')).toEqual({});
    expect(parseTwseDailyQuotes({ stat: 'NO_DATA' }, '2026-09-30')).toEqual({});
    expect(parseTpexDailyQuotes(null, '2026-09-30')).toEqual({});
    expect(saveTwQuotesToSqlite({}, testDbPath)).toEqual({ savedCount: 0 });
  });

  it('5. 當物件缺漏 symbol 鍵時應自動從 Map Key 補齊，且自動剝除 O 尾綴 (Spec 0170)', () => {
    initSqliteLakehouseDb(testDbPath);
    const legacyQuotesMap = {
      '3293O': {
        // 故意無 symbol 鍵
        date: '2026-10-07',
        open: 740,
        high: 755,
        low: 735,
        close: 750,
        volume: 2000000,
      },
      '00679B': {
        // 故意無 symbol 鍵
        date: '2026-10-07',
        open: 31.4,
        high: 31.6,
        low: 31.3,
        close: 31.5,
        volume: 50000000,
      },
    };

    const result = saveTwQuotesToSqlite(legacyQuotesMap, testDbPath);
    expect(result.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    // 3293O 應被自動正規化為 3293 入庫
    const rowOtc = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('3293', '2026-10-07');
    expect(rowOtc).toBeDefined();
    expect(rowOtc.close).toBe(750);

    const rowEtf = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('00679B', '2026-10-07');
    expect(rowEtf).toBeDefined();
    expect(rowEtf.close).toBe(31.5);
  });
});
