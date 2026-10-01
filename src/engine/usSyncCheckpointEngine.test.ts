import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  getPendingUsSymbols,
  recordSyncCheckpoint,
  getSyncCheckpointStatus,
} = require('../../scripts/market-sync/us-sync-checkpoint-engine.cjs');
const {
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 09 - 美股 Checkpoint 斷點續傳與重試狀態機 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_checkpoint.db');

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

  it('1. 應能準確記錄並查詢同步 Checkpoint 狀態 (recordSyncCheckpoint)', () => {
    initSqliteLakehouseDb(testDbPath);

    recordSyncCheckpoint('US', 'AAPL', 'SUCCESS', '2026-09-30', undefined, testDbPath);
    const cp = getSyncCheckpointStatus('US', 'AAPL', testDbPath);

    expect(cp).toBeDefined();
    expect(cp.status).toBe('SUCCESS');
    expect(cp.last_success_date).toBe('2026-09-30');
    expect(cp.error_msg).toBeNull();
  });

  it('2. 應能過濾掉當日已成功標的，支援中斷後斷點續傳 (getPendingUsSymbols)', () => {
    const allSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA'];

    // 模擬已完成了 AAPL 與 MSFT
    recordSyncCheckpoint('US', 'MSFT', 'SUCCESS', '2026-09-30', undefined, testDbPath);
    // 模擬 NVDA 遭遇 429 失敗
    recordSyncCheckpoint('US', 'NVDA', 'FAILED', '2026-09-29', '429_RATE_LIMITED', testDbPath);

    // 查詢 2026-09-30 待執行的標的
    const pending = getPendingUsSymbols(allSymbols, '2026-09-30', testDbPath);

    // AAPL 與 MSFT 今日已成功，應被排除；NVDA (失敗) 與 TSLA (未執行) 應留在佇列中
    expect(pending).toContain('NVDA');
    expect(pending).toContain('TSLA');
    expect(pending).not.toContain('AAPL');
    expect(pending).not.toContain('MSFT');
  });

  it('3. 當標的重試成功後，狀態應更新為 SUCCESS 且清除錯誤訊息', () => {
    recordSyncCheckpoint('US', 'NVDA', 'SUCCESS', '2026-09-30', undefined, testDbPath);
    const cp = getSyncCheckpointStatus('US', 'NVDA', testDbPath);

    expect(cp.status).toBe('SUCCESS');
    expect(cp.last_success_date).toBe('2026-09-30');
    expect(cp.error_msg).toBeNull();
  });
});
