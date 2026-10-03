/**
 * ingest-tw-tdcc.cjs
 * 台灣集中保管結算所 (TDCC) 股權分散表與千張大戶持股比入庫模組 (Spec 0163 / Ticket 06)
 */

const https = require('https');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 解析 TDCC 分級記錄，聚合各標的大戶與散戶比例
 * TDCC 分級標準：
 * 1~9: 1~50 張
 * 1~5: 1~10 張 (散戶)
 * 12~15: 400 張以上 (大戶)
 * 15: 1000 張以上 (千張大戶)
 * 17: 合計
 * @param {Array<{ symbol: string, level: number, shareholders: number, shares: number }>} rows
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, { symbol: string, date: string, totalShareholders: number, over400Ratio: number, over1000Ratio: number, under10Ratio: number }>}
 */
function parseTdccRecords(rows, dateStr) {
  const result = {};
  if (!Array.isArray(rows) || rows.length === 0) return result;

  const grouped = {};
  for (const r of rows) {
    if (!r || !r.symbol) continue;
    const sym = String(r.symbol).trim();
    if (!grouped[sym]) {
      grouped[sym] = {
        totalShares: 0,
        totalShareholders: 0,
        sharesOver400: 0,
        sharesOver1000: 0,
        sharesUnder10: 0,
      };
    }

    const g = grouped[sym];
    const lvl = Number(r.level);
    const shares = Number(r.shares) || 0;
    const shareholders = Number(r.shareholders) || 0;

    if (lvl === 17) {
      g.totalShares = shares;
      g.totalShareholders = shareholders;
    } else {
      if (lvl >= 12 && lvl <= 15) {
        g.sharesOver400 += shares;
      }
      if (lvl === 15) {
        g.sharesOver1000 += shares;
      }
      if (lvl >= 1 && lvl <= 5) {
        g.sharesUnder10 += shares;
      }
    }
  }

  for (const [sym, g] of Object.entries(grouped)) {
    const tot = g.totalShares > 0 ? g.totalShares : (g.sharesOver400 + g.sharesUnder10);
    const over400Ratio = tot > 0 ? (g.sharesOver400 / tot) * 100 : 0;
    const over1000Ratio = tot > 0 ? (g.sharesOver1000 / tot) * 100 : 0;
    const under10Ratio = tot > 0 ? (g.sharesUnder10 / tot) * 100 : 0;

    result[sym] = {
      symbol: sym,
      date: dateStr,
      totalShareholders: g.totalShareholders,
      over400Ratio: Number(over400Ratio.toFixed(2)),
      over1000Ratio: Number(over1000Ratio.toFixed(2)),
      under10Ratio: Number(under10Ratio.toFixed(2)),
    };
  }

  return result;
}

/**
 * 將 TDCC 股權分散記錄批次寫入 SQLite tw_tdcc_distribution
 * @param {Record<string, object>} distributionMap
 * @param {string} dateStr
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTdccDistributionToSqlite(distributionMap, dateStr, customDbPath) {
  if (!distributionMap || typeof distributionMap !== 'object' || !dateStr) {
    return { savedCount: 0 };
  }

  const entries = Object.values(distributionMap);
  if (entries.length === 0) return { savedCount: 0 };

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_tdcc_distribution (
      symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      total_shareholders = excluded.total_shareholders,
      over_400_ratio = excluded.over_400_ratio,
      over_1000_ratio = excluded.over_1000_ratio,
      under_10_ratio = excluded.under_10_ratio,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  const now = Date.now();
  try {
    for (const item of entries) {
      if (!item || !item.symbol) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(dateStr).trim(),
        item.totalShareholders || null,
        item.over400Ratio !== undefined ? Number(item.over400Ratio) : null,
        item.over1000Ratio !== undefined ? Number(item.over1000Ratio) : null,
        item.under10Ratio !== undefined ? Number(item.under10Ratio) : null,
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
  parseTdccRecords,
  saveTdccDistributionToSqlite,
};
