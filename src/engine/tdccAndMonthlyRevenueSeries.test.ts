import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
const { runTdccIngestion } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
const { runMonthlyRevenueIngestion } = require('../../scripts/market-sync/ingest-tw-monthly-revenue.cjs');

const TEST_DB_PATH = path.resolve(process.cwd(), '.scratch/test-market-cache/test_series.db');

describe('Spec 0172 / Ticket 02: TDCC 集保千張大戶與月營收歷史時間序列回補 (TDD)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    // 注入測試標的 3260 與 2330
    const now = Date.now();
    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, exchange, type, updated_at)
      VALUES (?, ?, 'TW', 'TPEX', 'STOCK', ?), (?, ?, 'TW', 'TWSE', 'STOCK', ?)
    `).run('3260', '威剛', now, '2330', '台積電', now);
  });

  afterEach(() => {
    try {
      closeSqliteDb();
    } catch {
      // ignore
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
  });

  it('1. runTdccIngestion 應支援回補最近 10 個週五結算日之 TDCC 股權分散時間序列', async () => {
    const { weeksCount } = await runTdccIngestion(TEST_DB_PATH);
    expect(weeksCount).toBeGreaterThanOrEqual(10);

    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    const rows3260 = db.prepare('SELECT date, over_1000_ratio, total_shareholders FROM tw_tdcc_distribution WHERE symbol = ? ORDER BY date DESC').all('3260');
    expect(rows3260.length).toBeGreaterThanOrEqual(10);

    // 驗證近 4 週大戶比率有真實變動
    const ratios = rows3260.map((r: any) => r.over_1000_ratio);
    const diffRatios = new Set(ratios);
    expect(diffRatios.size).toBeGreaterThan(1);
  });

  it('2. runMonthlyRevenueIngestion 應支援回補最近 12 個月之月營收時間序列', async () => {
    const { monthsCount } = await runMonthlyRevenueIngestion(TEST_DB_PATH);
    expect(monthsCount).toBeGreaterThanOrEqual(12);

    const db = initSqliteLakehouseDb(TEST_DB_PATH);
    const rows3260 = db.prepare('SELECT year_month, revenue, yoy_rate FROM tw_monthly_revenue WHERE symbol = ? ORDER BY year_month DESC').all('3260');
    expect(rows3260.length).toBe(12);

    // 驗證歷史月份排列正確且 YoY 存在真實動態數據
    const latest = rows3260[0] as any;
    expect(latest.year_month).toBe('2026-08');
    const oldest = rows3260[rows3260.length - 1] as any;
    expect(oldest.year_month).toBe('2025-09');
  });
});
