import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 01 - 美股下市標記與跳過輪詢機制 (Spec 0164)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_delisted.db');

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

  it('1. recordSyncCheckpoint 應支援 DELISTED 狀態並正確持久化', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { recordSyncCheckpoint, getSyncCheckpointStatus } = require('../../scripts/market-sync/us-sync-checkpoint-engine.cjs');

    initSqliteLakehouseDb(testDbPath);
    recordSyncCheckpoint('US', 'ATVI', 'DELISTED', '2026-10-02', 'HTTP_404_DELISTED', testDbPath);

    const cp = getSyncCheckpointStatus('US', 'ATVI', testDbPath);
    expect(cp).toBeDefined();
    expect(cp.status).toBe('DELISTED');
    expect(cp.error_msg).toBe('HTTP_404_DELISTED');

    closeSqliteDb();
  });

  it('2. getPendingUsSymbols 應自動排除 DELISTED 與當日 SUCCESS 標的', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { recordSyncCheckpoint, getPendingUsSymbols } = require('../../scripts/market-sync/us-sync-checkpoint-engine.cjs');

    initSqliteLakehouseDb(testDbPath);
    recordSyncCheckpoint('US', 'AAPL', 'SUCCESS', '2026-10-03', null, testDbPath);
    recordSyncCheckpoint('US', 'ATVI', 'DELISTED', '2026-10-02', 'HTTP_404_DELISTED', testDbPath);
    recordSyncCheckpoint('US', 'NVDA', 'PENDING', '2026-10-02', null, testDbPath);

    const universe = ['AAPL', 'ATVI', 'NVDA', 'MSFT'];
    const pending = getPendingUsSymbols(universe, '2026-10-03', testDbPath);

    expect(pending).toContain('NVDA');
    expect(pending).toContain('MSFT');
    expect(pending).not.toContain('AAPL'); // 已 SUCCESS
    expect(pending).not.toContain('ATVI'); // 已 DELISTED

    closeSqliteDb();
  });
});
