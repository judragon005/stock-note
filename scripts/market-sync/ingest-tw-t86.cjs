/**
 * ingest-tw-t86.cjs
 * 台股官方三大法人買賣超 (T86) 批次入庫模組
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { parseCleanNumber } = require('./ingest-tw-quotes.cjs');

/**
 * 解析 TWSE 官方三大法人 T86 報表
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, foreignNet: number, trustNet: number, dealerNet: number }>}
 */
function parseTwseT86(rawData) {
  const result = {};
  if (!rawData || (rawData.stat !== 'OK' && rawData.stat !== 'ok') || !Array.isArray(rawData.data)) {
    return result;
  }

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 12) continue;
    const symbol = String(row[0]).trim();
    if (symbol.length > 6) continue;

    // row[4]: 外資買賣超股數, row[10]: 投信買賣超股數, row[11]: 自營商買賣超股數
    const foreignNet = Math.round(parseCleanNumber(row[4]) / 1000);
    const trustNet = Math.round(parseCleanNumber(row[10]) / 1000);
    const dealerNet = Math.round(parseCleanNumber(row[11]) / 1000);

    result[symbol] = {
      symbol,
      foreignNet,
      trustNet,
      dealerNet,
    };
  }
  return result;
}

/**
 * 解析 TPEx 上櫃官方三大法人買賣超報表
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, foreignNet: number, trustNet: number, dealerNet: number }>}
 */
function parseTpexT86(rawData) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      let foreignNet = 0;
      let trustNet = 0;
      let dealerNet = 0;

      if (row.length >= 24) {
        // 標準 24 欄格式
        foreignNet = Math.round(parseCleanNumber(row[10]) / 1000);
        trustNet = Math.round(parseCleanNumber(row[13]) / 1000);
        dealerNet = Math.round(parseCleanNumber(row[22]) / 1000);
      } else {
        foreignNet = Math.round(parseCleanNumber(row[4]) / 1000);
        trustNet = Math.round(parseCleanNumber(row[10] || row[7]) / 1000);
        dealerNet = Math.round(parseCleanNumber(row[11] || row[8]) / 1000);
      }

      result[symbol] = {
        symbol,
        foreignNet,
        trustNet,
        dealerNet,
      };
    }
  }
  return result;
}

/**
 * 批次寫入三大法人買賣超至 SQLite tw_institutional_chips 表
 * @param {Record<string, { symbol: string, foreignNet: number, trustNet: number, dealerNet: number }>} t86Map
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTwT86ToSqlite(t86Map, dateStr, customDbPath) {
  if (!t86Map || typeof t86Map !== 'object' || !dateStr) {
    return { savedCount: 0 };
  }

  const entries = Object.values(t86Map);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      foreign_net = excluded.foreign_net,
      trust_net = excluded.trust_net,
      dealer_net = excluded.dealer_net
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of entries) {
      if (!item || !item.symbol) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(dateStr).trim(),
        item.foreignNet !== undefined ? (Number(item.foreignNet) || 0) : (item.foreignNetShares !== undefined ? (Number(item.foreignNetShares) || 0) : 0),
        item.trustNet !== undefined ? (Number(item.trustNet) || 0) : (item.trustNetShares !== undefined ? (Number(item.trustNetShares) || 0) : 0),
        item.dealerNet !== undefined ? (Number(item.dealerNet) || 0) : (item.dealerNetShares !== undefined ? (Number(item.dealerNetShares) || 0) : 0)
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
  parseTwseT86,
  parseTpexT86,
  saveTwT86ToSqlite,
};
