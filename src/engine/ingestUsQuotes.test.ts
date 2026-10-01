import { describe, it, expect, afterAll } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const {
  parseYahooChartData,
  saveUsCandlesToSqlite,
} = require('../../scripts/market-sync/ingest-us-quotes.cjs');
const {
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

describe('Ticket 08 - 美股 Yahoo Chart 日 K 限流採集器與還原價計算 (TDD Seam)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_us_quotes.db');

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

  it('1. 應能準確解析 Yahoo Finance Chart 回應封包並提取還原收盤價 (adjclose)', () => {
    const mockChartRaw = {
      chart: {
        result: [
          {
            timestamp: [1727703000, 1727789400], // 秒級 Unix timestamp
            indicators: {
              quote: [
                {
                  open: [130.0, 132.0],
                  high: [135.0, 136.0],
                  low: [129.0, 131.0],
                  close: [134.0, 135.5],
                  volume: [45000000, 50000000],
                },
              ],
              adjclose: [
                {
                  adjclose: [134.0, 135.5],
                },
              ],
            },
          },
        ],
      },
    };

    const candles = parseYahooChartData(mockChartRaw);
    expect(candles).toHaveLength(2);
    expect(candles[0].open).toBe(130.0);
    expect(candles[0].close).toBe(134.0);
    expect(candles[0].adjClose).toBe(134.0);
    expect(candles[0].volume).toBe(45000000);
    expect(candles[1].close).toBe(135.5);
  });

  it('2. 應支援將美股日 K 數列事務寫入 SQLite daily_candles 且標記市場', () => {
    initSqliteLakehouseDb(testDbPath);
    const mockCandles = [
      {
        date: '2026-09-29',
        open: 130.0,
        high: 135.0,
        low: 129.0,
        close: 134.0,
        adjClose: 134.0,
        volume: 45000000,
        turnover: 6030000000,
      },
      {
        date: '2026-09-30',
        open: 132.0,
        high: 136.0,
        low: 131.0,
        close: 135.5,
        adjClose: 135.5,
        volume: 50000000,
        turnover: 6775000000,
      },
    ];

    const result = saveUsCandlesToSqlite('NVDA', mockCandles, testDbPath);
    expect(result.savedCount).toBe(2);

    const db = getSqliteDbConnection(testDbPath);
    const row = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('NVDA', '2026-09-30');
    expect(row.close).toBe(135.5);
    expect(row.adj_close).toBe(135.5);
    expect(row.volume).toBe(50000000);
  });

  it('3. 遇到缺失 adjclose 欄位或空封包時應安全降級為 close', () => {
    const mockNoAdj = {
      chart: {
        result: [
          {
            timestamp: [1727789400],
            indicators: {
              quote: [
                {
                  open: [200.0],
                  high: [205.0],
                  low: [198.0],
                  close: [202.0],
                  volume: [10000000],
                },
              ],
            },
          },
        ],
      },
    };

    const candles = parseYahooChartData(mockNoAdj);
    expect(candles).toHaveLength(1);
    expect(candles[0].close).toBe(202.0);
    expect(candles[0].adjClose).toBe(202.0); // 降級為 close

    expect(parseYahooChartData(null)).toEqual([]);
    expect(saveUsCandlesToSqlite('TEST', [], testDbPath)).toEqual({ savedCount: 0 });
  });
});
