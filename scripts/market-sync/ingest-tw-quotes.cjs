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
      const transactions = parseCleanNumber(row[3]);
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
          transactions: transactions > 0 ? transactions : undefined,
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
      const rawSymbol = String(row[0]).trim();
      if (rawSymbol.length > 7) continue;

      // 剝除櫃買可能的 'O' 尾綴 (如 3293O -> 3293, 00679BO -> 00679B)
      const symbol = rawSymbol.endsWith('O') && /^\d+[A-Z]?O$/.test(rawSymbol)
        ? rawSymbol.slice(0, -1)
        : rawSymbol;
      if (symbol.length > 6) continue;

      const isSplitSign = row[3] === '+' || row[3] === '-' || row[3] === 'X' || row[3] === ' ';
      const close = parseCleanNumber(row[2]);
      const open = isSplitSign ? parseCleanNumber(row[5]) : parseCleanNumber(row[4]);
      const high = isSplitSign ? parseCleanNumber(row[6]) : parseCleanNumber(row[5]);
      const low = isSplitSign ? parseCleanNumber(row[7]) : parseCleanNumber(row[6]);
      const volume = isSplitSign ? parseCleanNumber(row[8]) : parseCleanNumber(row[7]);
      const turnover = isSplitSign ? parseCleanNumber(row[9]) : (row.length >= 9 ? parseCleanNumber(row[8]) : 0);
      const transactions = isSplitSign
        ? (row.length >= 11 ? parseCleanNumber(row[10]) : undefined)
        : (row.length >= 10 ? parseCleanNumber(row[9]) : undefined);

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
          transactions: transactions && transactions > 0 ? transactions : undefined,
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

  const entries = Object.entries(quotesMap);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      adj_close = excluded.adj_close,
      volume = excluded.volume,
      turnover = excluded.turnover,
      transactions = COALESCE(excluded.transactions, daily_candles.transactions)
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const [keySymbol, item] of entries) {
      if (!item || !item.date || !item.close) continue;
      const rawSymbol = item.symbol || keySymbol;
      if (!rawSymbol) continue;

      const cleanSymbol = String(rawSymbol).trim().toUpperCase();
      // 剝除櫃買可能的 'O' 尾綴 (如 3293O -> 3293, 00679BO -> 00679B)
      const symbol = cleanSymbol.endsWith('O') && /^\d+[A-Z]?O$/.test(cleanSymbol)
        ? cleanSymbol.slice(0, -1)
        : cleanSymbol;

      const close = Number(item.close);
      if (!close || isNaN(close) || close <= 0) continue;

      const open = Number(item.open) > 0 ? Number(item.open) : close;
      let high = Number(item.high) > 0 ? Number(item.high) : Math.max(open, close);
      let low = Number(item.low) > 0 ? Number(item.low) : Math.min(open, close);

      // 防呆平滑
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);

      const adjClose = Number(item.adj_close || item.adjClose || close);
      const volume = Number(item.volume) || 0;
      const turnover = Number(item.turnover) || 0;
      const transactions = item.transactions && Number(item.transactions) > 0 ? Math.round(Number(item.transactions)) : null;

      stmt.run(
        symbol,
        String(item.date).trim(),
        open,
        high,
        low,
        close,
        adjClose,
        volume,
        turnover,
        transactions
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
