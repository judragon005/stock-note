import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 07 - 公開資訊觀測站 (MOPS) 全市場月營收成長與歷史新高 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_revenue.db');

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

  it('1. computeRevenueGrowth 應精確計算 YoY, MoM 與歷史新高判定', () => {
    const { computeRevenueGrowth } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');
    expect(typeof computeRevenueGrowth).toBe('function');

    const pastRevenues = [200000, 220000, 250000]; // 歷史最高 250,000
    const currentRevenue = 280000;                  // 創歷史新高
    const lastYearRevenue = 200000;
    const lastMonthRevenue = 250000;

    const growth = computeRevenueGrowth(currentRevenue, lastYearRevenue, lastMonthRevenue, pastRevenues);
    // YoY: (280000 - 200000) / 200000 * 100 = 40.0%
    expect(growth.yoyRate).toBe(40.0);
    // MoM: (280000 - 250000) / 250000 * 100 = 12.0%
    expect(growth.momRate).toBe(12.0);
    // 歷史新高
    expect(growth.isAllTimeHigh).toBe(1);
  });

  it('2. saveMonthlyRevenueToSqlite 應成功將月營收寫入 tw_monthly_revenue', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { saveMonthlyRevenueToSqlite } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

    const db = initSqliteLakehouseDb(testDbPath);

    const mockRevenueMap = {
      '2330': {
        symbol: '2330',
        yearMonth: '2026-09',
        revenue: 280000000,
        lastYearRevenue: 200000000,
        yoyRate: 40.0,
        momRate: 12.0,
        isAllTimeHigh: 1,
      }
    };

    const res = saveMonthlyRevenueToSqlite(mockRevenueMap, testDbPath);
    expect(res.savedCount).toBe(1);

    const row = db.prepare("SELECT * FROM tw_monthly_revenue WHERE symbol = '2330' AND year_month = '2026-09'").get() as any;
    expect(row).toBeDefined();
    expect(row.revenue).toBe(280000000);
    expect(row.yoy_rate).toBe(40.0);
    expect(row.is_all_time_high).toBe(1);

    closeSqliteDb();
  });
});
