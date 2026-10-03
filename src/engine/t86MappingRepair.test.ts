import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 02 - 三大法人 T86 欄位映射相容性修復 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_t86_mapping.db');

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

  it('1. saveTwT86ToSqlite 應同時相容 foreignNetShares 與 foreignNet 鍵名，且負值不失真', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { saveTwT86ToSqlite } = require('../../scripts/market-sync/ingest-tw-t86.cjs');
    
    const db = initSqliteLakehouseDb(testDbPath);

    // 模擬來自 market-sync-core.cjs 的真實格式 (含 foreignNetShares)
    const mockT86BulkMap = {
      '2330': {
        symbol: '2330',
        name: '台積電',
        foreignNetShares: -5914,
        trustNetShares: 254,
        dealerNetShares: 317,
        totalNetShares: -5343,
      },
      '0050': {
        symbol: '0050',
        name: '元大台灣50',
        foreignNet: -32346, // 舊版格式
        trustNet: 2250,
        dealerNet: 1005,
      }
    };

    const res = saveTwT86ToSqlite(mockT86BulkMap, '2026-10-02', testDbPath);
    expect(res.savedCount).toBe(2);

    // 驗證 2330 入庫結果
    const row2330 = db.prepare("SELECT * FROM tw_institutional_chips WHERE symbol = '2330' AND date = '2026-10-02'").get() as any;
    expect(row2330).toBeDefined();
    expect(row2330.foreign_net).toBe(-5914);
    expect(row2330.trust_net).toBe(254);
    expect(row2330.dealer_net).toBe(317);

    // 驗證 0050 入庫結果
    const row0050 = db.prepare("SELECT * FROM tw_institutional_chips WHERE symbol = '0050' AND date = '2026-10-02'").get() as any;
    expect(row0050).toBeDefined();
    expect(row0050.foreign_net).toBe(-32346);
    expect(row0050.trust_net).toBe(2250);
    expect(row0050.dealer_net).toBe(1005);

    closeSqliteDb();
  });
});
