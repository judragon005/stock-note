/**
 * ingest-tw-quotes.cjs
 * 台股官方 TWSE/TPEx 收盤行情整包下載與日 K 批次入庫
 */

const https = require('https');
const http = require('http');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '--' || str === '' || str === '---' || str === '除息' || str === '除權') return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * 解析 TWSE 官方 MI_INDEX 收盤行情總表
 * @param {object} rawData
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, object>}
 */
function parseTwseDailyQuotes(rawData, dateStr) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.tables)) return result;

  for (const table of rawData.tables) {
    if (!Array.isArray(table.data)) continue;
    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const volume = parseCleanNumber(row[2]);
      const turnover = parseCleanNumber(row[4]);
      const open = parseCleanNumber(row[5]);
      const high = parseCleanNumber(row[6]);
      const low = parseCleanNumber(row[7]);
      const close = parseCleanNumber(row[8]);

      if (close > 0) {
        result[symbol] = {
          symbol,
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          adj_close: close,
          volume,
          turnover: turnover > 0 ? turnover : 0,
        };
      }
    }
  }
  return result;
}

/**
 * 解析 TPEx 官方上櫃收盤行情總表
 * @param {object} rawData
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, object>}
 */
function parseTpexDailyQuotes(rawData, dateStr) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 8) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const close = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[5] || row[4]);
      const high = parseCleanNumber(row[6] || row[5]);
      const low = parseCleanNumber(row[7] || row[6]);
      const volume = parseCleanNumber(row[8] || row[7]);
      const turnover = parseCleanNumber(row[9] || row[8]);

      if (close > 0) {
        result[symbol] = {
          symbol,
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          adj_close: close,
          volume,
          turnover: turnover > 0 ? turnover : 0,
        };
      }
    }
  }
  return result;
}

/**
 * 批次事務寫入收盤日 K 至 SQLite
 * @param {Record<string, object>} quotesMap
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTwQuotesToSqlite(quotesMap, customDbPath) {
  if (!quotesMap || typeof quotesMap !== 'object') {
    return { savedCount: 0 };
  }

  const entries = Object.values(quotesMap);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      adj_close = excluded.adj_close,
      volume = excluded.volume,
      turnover = excluded.turnover
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of entries) {
      if (!item || !item.symbol || !item.date || !item.close) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(item.date).trim(),
        Number(item.open) || Number(item.close),
        Number(item.high) || Number(item.close),
        Number(item.low) || Number(item.close),
        Number(item.close),
        Number(item.adj_close || item.close),
        Number(item.volume) || 0,
        Number(item.turnover) || 0
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
  parseCleanNumber,
  parseTwseDailyQuotes,
  parseTpexDailyQuotes,
  saveTwQuotesToSqlite,
};
