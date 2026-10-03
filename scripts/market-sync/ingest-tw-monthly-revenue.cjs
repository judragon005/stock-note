/**
 * ingest-tw-monthly-revenue.cjs
 * 公開資訊觀測站 (MOPS) 全市場月營收成長與歷史新高入庫模組 (Spec 0163 / Ticket 07)
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 計算單一標的之月營收年增率 (YoY)、月增率 (MoM) 與是否創歷史新高
 * @param {number} currentRevenue - 當月營收
 * @param {number} [lastYearRevenue] - 去年同月營收
 * @param {number} [lastMonthRevenue] - 上月營收
 * @param {number[]} [pastRevenues] - 歷史所有月份營收清單
 * @returns {{ yoyRate: number | null, momRate: number | null, isAllTimeHigh: number }}
 */
function computeRevenueGrowth(currentRevenue, lastYearRevenue, lastMonthRevenue, pastRevenues = []) {
  if (currentRevenue === null || currentRevenue === undefined || isNaN(currentRevenue)) {
    return { yoyRate: null, momRate: null, isAllTimeHigh: 0 };
  }

  const cur = Number(currentRevenue);

  // YoY: (當月 - 去年同月) / 去年同月 * 100
  let yoyRate = null;
  if (lastYearRevenue !== null && lastYearRevenue !== undefined && Number(lastYearRevenue) > 0) {
    const ly = Number(lastYearRevenue);
    yoyRate = Number((((cur - ly) / ly) * 100).toFixed(2));
  }

  // MoM: (當月 - 上月) / 上月 * 100
  let momRate = null;
  if (lastMonthRevenue !== null && lastMonthRevenue !== undefined && Number(lastMonthRevenue) > 0) {
    const lm = Number(lastMonthRevenue);
    momRate = Number((((cur - lm) / lm) * 100).toFixed(2));
  }

  // 歷史新高：當月大於所有過去月份
  let isAllTimeHigh = 0;
  if (Array.isArray(pastRevenues) && pastRevenues.length > 0) {
    const validPast = pastRevenues.filter(v => v !== null && !isNaN(v) && Number(v) > 0);
    if (validPast.length > 0) {
      const maxPast = Math.max(...validPast);
      if (cur > maxPast) {
        isAllTimeHigh = 1;
      }
    }
  }

  return { yoyRate, momRate, isAllTimeHigh };
}

/**
 * 將月營收批次寫入 SQLite tw_monthly_revenue
 * @param {Record<string, { symbol: string, yearMonth: string, revenue: number, lastYearRevenue?: number, yoyRate?: number, momRate?: number, isAllTimeHigh?: number }>} revenueMap
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveMonthlyRevenueToSqlite(revenueMap, customDbPath) {
  if (!revenueMap || typeof revenueMap !== 'object') {
    return { savedCount: 0 };
  }

  const entries = Object.values(revenueMap);
  if (entries.length === 0) return { savedCount: 0 };

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_monthly_revenue (
      symbol, year_month, revenue, last_year_revenue, yoy_rate, mom_rate, is_all_time_high, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, year_month) DO UPDATE SET
      revenue = excluded.revenue,
      last_year_revenue = excluded.last_year_revenue,
      yoy_rate = excluded.yoy_rate,
      mom_rate = excluded.mom_rate,
      is_all_time_high = excluded.is_all_time_high,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  const now = Date.now();
  try {
    for (const item of entries) {
      if (!item || !item.symbol || !item.yearMonth) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(item.yearMonth).trim(),
        Number(item.revenue) || 0,
        item.lastYearRevenue !== undefined ? Number(item.lastYearRevenue) : null,
        item.yoyRate !== undefined ? Number(item.yoyRate) : null,
        item.momRate !== undefined ? Number(item.momRate) : null,
        item.isAllTimeHigh !== undefined ? Number(item.isAllTimeHigh) : 0,
        now
      );
      count++;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { savedCount: count };
}

module.exports = {
  computeRevenueGrowth,
  saveMonthlyRevenueToSqlite,
};
