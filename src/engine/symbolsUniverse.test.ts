import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  upsertSymbolsMeta,
  searchSymbolsMeta,
  seedDefaultSymbolsUniverse,
} = require('../../scripts/market-sync/seed-symbols-universe.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 02 - 標的註冊表種子入庫與 30ms 模糊搜尋索引 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_universe_history.db');

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

  it('1. 應能批次寫入標的元數據 (upsertSymbolsMeta)', () => {
    initSqliteLakehouseDb(testDbPath);
    const mockSymbols = [
      { symbol: '2330', name: '台積電', market: 'TW', exchange: 'TWSE', type: 'STOCK' },
      { symbol: '0050', name: '元大台灣50', market: 'TW', exchange: 'TWSE', type: 'ETF' },
      { symbol: 'AAPL', name: '蘋果', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
      { symbol: 'NVDA', name: '輝達', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
    ];

    const result = upsertSymbolsMeta(mockSymbols, testDbPath);
    expect(result.upsertedCount).toBe(4);

    const db = getSqliteDbConnection(testDbPath);
    const row = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get('2330');
    expect(row.name).toBe('台積電');
    expect(row.market).toBe('TW');
  });

  it('2. 應能執行極速模糊搜尋 (searchSymbolsMeta) 且延遲小於 30ms', () => {
    const start = performance.now();
    const results = searchSymbolsMeta('台積', 10, testDbPath);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(30); // 確保在 30 毫秒內
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('2330');
    expect(results[0].name).toBe('台積電');

    // 代碼搜尋
    const codeResults = searchSymbolsMeta('AAPL', 10, testDbPath);
    expect(codeResults.length).toBeGreaterThan(0);
    expect(codeResults[0].symbol).toBe('AAPL');
    expect(codeResults[0].name).toBe('蘋果');
  });

  it('3. 應能成功匯入預設全市場種子名冊 (seedDefaultSymbolsUniverse)', () => {
    const seedResult = seedDefaultSymbolsUniverse(testDbPath);
    expect(seedResult.totalSeeded).toBeGreaterThan(2000);

    // 驗證熱門標的是否在資料庫中
    const hitTw = searchSymbolsMeta('2454', 1, testDbPath);
    expect(hitTw.length).toBe(1);
    expect(hitTw[0].symbol).toBe('2454');

    const hitUs = searchSymbolsMeta('VOO', 1, testDbPath);
    expect(hitUs.length).toBe(1);
    expect(hitUs[0].symbol).toBe('VOO');
  });

  it('4. 遇空關鍵字或特殊字元搜尋時應防禦性回傳空陣列或安全處理', () => {
    expect(searchSymbolsMeta('', 10, testDbPath)).toEqual([]);
    expect(searchSymbolsMeta('   ', 10, testDbPath)).toEqual([]);
    expect(searchSymbolsMeta("'; DROP TABLE symbols_meta; --", 10, testDbPath)).toEqual([]);
  });
});
