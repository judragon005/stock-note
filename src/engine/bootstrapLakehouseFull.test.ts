import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');

const { runBootstrapFull } = require('../../scripts/market-sync/bootstrap-lakehouse-full.cjs');
const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

const testDbPath = path.resolve(__dirname, '../../.scratch/test_bootstrap.db');

describe('bootstrap-lakehouse-full - TDD Unit Tests', () => {
  beforeEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    closeSqliteDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('1. runBootstrapFull 應能將估值、除權息、宏觀與質押成功寫入目標資料庫', async () => {
    const mockValuationMap = {
      '1217': {
        symbol: '1217',
        name: '愛之味',
        pe: 14.92,
        pb: 0.63,
        dividendYield: 2.54,
        date: '2026-10-20',
      },
      '2330': {
        symbol: '2330',
        name: '台積電',
        pe: 22.5,
        pb: 4.8,
        dividendYield: 1.8,
        date: '2026-10-20',
      },
    };

    const res = await runBootstrapFull(testDbPath, {
      valuationMap: mockValuationMap,
      corporateActionsCount: 25,
      macroPayload: {
        date: '2026-10-20',
        riskFreeRate3m: 4.85,
        treasuryYield10y: 4.12,
        yieldSpread10y2y: 0.18,
        cnnFearGreedScore: 54.0,
        vixClose: 18.25,
        twPutCallRatio: 105.4,
        twForeignFuturesOi: -28450,
        twTrustFuturesOi: 12400,
      },
      pledges: [
        { symbol: '1217', reportDate: '2026-09', pledgedShares: 12000000, totalDirectorShares: 154000000, pledgeRatio: 7.8, insiderTransferShares: 0 },
      ],
    });
    expect(res).toBeDefined();
    expect(res.valuationCount).toBe(2);
    expect(res.corporateActionsCount).toBe(25);
    expect(res.macroSentimentSuccess).toBe(true);

    const db = initSqliteLakehouseDb(testDbPath);

    // 驗證 1217 估值存在
    const val1217 = db.prepare('SELECT * FROM tw_valuation_daily WHERE symbol = ?').get('1217');
    expect(val1217).toBeDefined();
    expect(val1217.pe).toBe(14.92);
    expect(val1217.dividend_yield).toBe(2.54);

    // 驗證宏觀情緒表不為空
    const macro = db.prepare('SELECT * FROM macro_sentiment_daily WHERE date = ?').get('2026-10-20');
    expect(macro).toBeDefined();
    expect(macro.treasury_yield_10y).toBe(4.12);

    // 驗證董監質押表不為空
    const pledge = db.prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol = ?').get('1217');
    expect(pledge).toBeDefined();
    expect(pledge.pledge_ratio).toBe(7.8);
  });
});
