import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  parseTwseT86,
  parseTpexT86,
  saveTwT86ToSqlite,
} = require('../../scripts/market-sync/ingest-tw-t86.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 05 - 台股三大法人 T86 批次入庫與籌碼表持久化 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_ingest_t86.db');

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

  it('1. 應能準確解析 TWSE 官方三大法人 T86 封包並將股數換算為張數 (parseTwseT86)', () => {
    const mockRaw = {
      stat: 'OK',
      date: '20260930',
      data: [
        ['2330', '台積電', '15,000,000', '10,000,000', '5,000,000', '0', '0', '0', '2,000,000', '500,000', '1,500,000', '-500,000', '6,000,000'],
        ['0050', '元大台灣50', '8,000,000', '4,000,000', '4,000,000', '0', '0', '0', '1,000,000', '0', '1,000,000', '200,000', '5,200,000'],
      ],
    };

    const parsed = parseTwseT86(mockRaw);
    expect(parsed['2330']).toBeDefined();
    expect(parsed['2330'].foreignNet).toBe(5000); // 5,000,000 / 1000
    expect(parsed['2330'].trustNet).toBe(1500);   // 1,500,000 / 1000
    expect(parsed['2330'].dealerNet).toBe(-500);  // -500,000 / 1000

    expect(parsed['0050'].foreignNet).toBe(4000);
    expect(parsed['0050'].trustNet).toBe(1000);
    expect(parsed['0050'].dealerNet).toBe(200);
  });

  it('2. 應能準確解析 TPEx 上櫃官方三大法人買賣超報表 (parseTpexT86)', () => {
    const mockTpexRaw = {
      tables: [
        {
          data: [
            ['6547', '高端疫苗', '100,000', '50,000', '50,000', '0', '0', '0', '20,000', '0', '20,000', '-10,000', '60,000'],
          ],
        },
      ],
    };

    const parsed = parseTpexT86(mockTpexRaw);
    expect(parsed['6547']).toBeDefined();
    expect(parsed['6547'].foreignNet).toBe(50); // 50,000 / 1000
    expect(parsed['6547'].trustNet).toBe(20);
    expect(parsed['6547'].dealerNet).toBe(-10);
  });

  it('3. 應支援整包法人買賣超事務寫入 tw_institutional_chips 且具備覆蓋更新能力 (saveTwT86ToSqlite)', () => {
    initSqliteLakehouseDb(testDbPath);
    const chipsMap = {
      '2330': { symbol: '2330', foreignNet: 5000, trustNet: 1500, dealerNet: -500 },
      '0050': { symbol: '0050', foreignNet: 4000, trustNet: 1000, dealerNet: 200 },
    };

    const result = saveTwT86ToSqlite(chipsMap, '2026-09-30', testDbPath);
    expect(result.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    const row = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('2330', '2026-09-30');
    expect(row.foreign_net).toBe(5000);
    expect(row.trust_net).toBe(1500);
    expect(row.dealer_net).toBe(-500);
  });

  it('4. 遇空封包時應安全返回空集合', () => {
    expect(parseTwseT86(null)).toEqual({});
    expect(parseTpexT86(null)).toEqual({});
    expect(saveTwT86ToSqlite({}, '2026-09-30', testDbPath)).toEqual({ savedCount: 0 });
  });
});
