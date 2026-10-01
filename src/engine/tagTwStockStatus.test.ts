import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  parseTwAttentionDisposition,
  updateStockStatusInSqlite,
  getStockStatus,
} = require('../../scripts/market-sync/tag-tw-stock-status.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 07 - 台股注意股票與處置股票狀態標記管線 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_stock_status.db');

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

  it('1. 應能解析注意股票與處置股票名單並判定優先級 (處置 > 注意)', () => {
    const mockAttentionRaw = {
      data: [
        ['2330', '台積電', '累積漲幅過大'],
        ['2603', '長榮', '週轉率過高'],
      ],
    };

    const mockDispositionRaw = {
      data: [
        ['2603', '長榮', '分盤撮合五分鐘'],
        ['3008', '大立光', '分盤撮合二十分鐘'],
      ],
    };

    const statusMap = parseTwAttentionDisposition(mockAttentionRaw, mockDispositionRaw);
    expect(statusMap['2330']).toBe('ATTENTION');
    // 長榮同時在注意與處置名單，應升級為最高危險度 DISPOSITION
    expect(statusMap['2603']).toBe('DISPOSITION');
    expect(statusMap['3008']).toBe('DISPOSITION');
  });

  it('2. 應能將狀態正確更新至 symbols_meta 並支援單檔查詢', () => {
    initSqliteLakehouseDb(testDbPath);
    const db = getSqliteDbConnection(testDbPath);

    // 預先插入三檔標的
    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, status, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('2330', '台積電', 'TW', 'NORMAL', Date.now());
    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, status, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('2603', '長榮', 'TW', 'NORMAL', Date.now());

    const statusMap = {
      '2330': 'ATTENTION',
      '2603': 'DISPOSITION',
    };

    const result = updateStockStatusInSqlite(statusMap, testDbPath);
    expect(result.updatedCount).toBe(2);

    expect(getStockStatus('2330', testDbPath)).toBe('ATTENTION');
    expect(getStockStatus('2603', testDbPath)).toBe('DISPOSITION');
    // 未列名者預設 NORMAL
    expect(getStockStatus('0050', testDbPath)).toBe('NORMAL');
  });

  it('3. 當次日解除處置時，updateStockStatusInSqlite 應支援復原為 NORMAL', () => {
    // 隔天處置名單僅剩 2330
    const nextDayStatusMap = {
      '2330': 'ATTENTION',
    };

    updateStockStatusInSqlite(nextDayStatusMap, testDbPath);
    expect(getStockStatus('2330', testDbPath)).toBe('ATTENTION');
    // 長榮已不在名單內，復原為 NORMAL
    expect(getStockStatus('2603', testDbPath)).toBe('NORMAL');
  });
});
