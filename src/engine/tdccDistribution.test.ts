import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 06 - 台灣集保結算所 (TDCC) 股權分散與千張大戶持股比 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_tdcc.db');

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

  it('1. parseTdccRecords 應精確計算 400 張、千張大戶比例與總股東人數', () => {
    const { parseTdccRecords } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
    expect(typeof parseTdccRecords).toBe('function');

    // 模擬集保原始分級資料 (總共 15 級，1: 1~999股, 12: 400~600張, 15: 1000張以上, 17: 合計)
    const mockRows = [
      { symbol: '2330', level: 1, shareholders: 500000, shares: 100000000 },
      { symbol: '2330', level: 12, shareholders: 500, shares: 250000000 },
      { symbol: '2330', level: 15, shareholders: 1500, shares: 20000000000 },
      { symbol: '2330', level: 17, shareholders: 1200000, shares: 25930000000 }, // 總計
    ];

    const result = parseTdccRecords(mockRows, '2026-10-02');
    expect(result['2330']).toBeDefined();
    expect(result['2330'].symbol).toBe('2330');
    expect(result['2330'].totalShareholders).toBe(1200000);
    // 1000 張以上比例: 20,000,000,000 / 25,930,000,000 = ~77.13%
    expect(result['2330'].over1000Ratio).toBeCloseTo(77.13, 1);
  });

  it('2. saveTdccDistributionToSqlite 應成功將大戶持股記錄寫入 tw_tdcc_distribution', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { saveTdccDistributionToSqlite } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

    const db = initSqliteLakehouseDb(testDbPath);

    const mockDistributionMap = {
      '2330': {
        symbol: '2330',
        date: '2026-10-02',
        totalShareholders: 1200000,
        over400Ratio: 88.5,
        over1000Ratio: 77.13,
        under10Ratio: 4.2,
      }
    };

    const res = saveTdccDistributionToSqlite(mockDistributionMap, '2026-10-02', testDbPath);
    expect(res.savedCount).toBe(1);

    const row = db.prepare("SELECT * FROM tw_tdcc_distribution WHERE symbol = '2330' AND date = '2026-10-02'").get() as any;
    expect(row).toBeDefined();
    expect(row.total_shareholders).toBe(1200000);
    expect(row.over_1000_ratio).toBe(77.13);
    expect(row.over_400_ratio).toBe(88.5);

    closeSqliteDb();
  });
});
