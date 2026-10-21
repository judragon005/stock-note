import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');

const {
  convertRocToIsoDate,
  parseTwseExDividendReport,
  ingestCorporateActionsToDb,
} = require('../../scripts/market-sync/ingest-tw-corporate-actions.cjs');
const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

const testDbPath = path.resolve(__dirname, '../../.scratch/test_ca.db');

describe('ingest-tw-corporate-actions - TDD Unit Tests', () => {
  beforeEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('1. convertRocToIsoDate 應正確轉換各種民國日期格式 (含中文年月日與純數字)', () => {
    expect(convertRocToIsoDate('115年11月06日')).toBe('2026-11-06');
    expect(convertRocToIsoDate('115/03/18')).toBe('2026-03-18');
    expect(convertRocToIsoDate('1150318')).toBe('2026-03-18');
  });

  it('2. parseTwseExDividendReport 應能正確解析 TWSE 官方 RWD 二維陣列格式', () => {
    const rawRwdData = {
      stat: 'OK',
      fields: ['除權除息日期', '股票代號', '名稱', '除權息', '無償配股率', '現金增資配股率', '現金增資認購價', '現金股利'],
      data: [
        ['115年10月23日', '2330', '台積電', '息', '0.00', '0.00', '0.00', '4.00'],
        ['115年11月06日', '0050', '元大台灣50', '息', '0.00', '0.00', '0.00', '待公告'],
      ],
    };

    const parsed = parseTwseExDividendReport(rawRwdData);
    expect(parsed.length).toBe(2);

    expect(parsed[0].symbol).toBe('2330');
    expect(parsed[0].exDate).toBe('2026-10-23');
    expect(parsed[0].cashDividendPerShare).toBe(4.0);

    expect(parsed[1].symbol).toBe('0050');
    expect(parsed[1].exDate).toBe('2026-11-06');
    expect(parsed[1].cashDividendPerShare).toBe(0);
  });

  it('3. ingestCorporateActionsToDb 應能成功寫入 corporate_action_calendar 表', () => {
    const mockRecords = [
      {
        symbol: '2330',
        market: 'TW',
        actionType: 'DIVIDEND',
        exDate: '2026-10-23',
        paymentDate: '2026-11-15',
        cashDividendPerShare: 4.0,
        stockDividendRatio: 0,
      },
    ];

    const saved = ingestCorporateActionsToDb(mockRecords, testDbPath);
    expect(saved).toBe(1);

    const db = initSqliteLakehouseDb(testDbPath);
    const row = db.prepare('SELECT * FROM corporate_action_calendar WHERE symbol = ?').get('2330');
    expect(row).toBeDefined();
    expect(row.cash_dividend_per_share).toBe(4.0);
    expect(row.ex_date).toBe('2026-10-23');
  });
});
