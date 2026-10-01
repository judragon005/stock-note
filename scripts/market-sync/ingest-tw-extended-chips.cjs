/**
 * ingest-tw-extended-chips.cjs
 * 台股借券賣出 SBL、信用交易與當沖比率批次解析與入庫
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { parseCleanNumber } = require('./ingest-tw-quotes.cjs');

/**
 * 解析 TWSE TWT93U 借券賣出與還券餘額表
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, sblBalance: number }>}
 */
function parseTwseSbl(rawData) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.data)) return result;

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const symbol = String(row[0]).trim();
    if (symbol.length > 6) continue;

    // row[5]: 當日借券賣出餘額
    const sblBalance = parseCleanNumber(row[5]);
    result[symbol] = {
      symbol,
      sblBalance,
    };
  }
  return result;
}

/**
 * 解析 TWSE MI_MARGN 融資融券彙總表
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, marginBalance: number, shortBalance: number }>}
 */
function parseTwseMargin(rawData) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 10) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      // row[5]: 融資今日餘額, row[9]: 融券今日餘額
      const marginBalance = parseCleanNumber(row[5]);
      const shortBalance = parseCleanNumber(row[9]);

      result[symbol] = {
        symbol,
        marginBalance,
        shortBalance,
      };
    }
  }
  return result;
}

/**
 * 解析 TWSE TWTB4U 當日沖銷交易標的及統計
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, dayTradeRate: number }>}
 */
function parseTwseDayTrade(rawData) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.data)) return result;

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const symbol = String(row[0]).trim();
    if (symbol.length > 6) continue;

    // row[4]: 當沖成交量佔該證券成交量比率
    const dayTradeRate = parseCleanNumber(row[4]);
    result[symbol] = {
      symbol,
      dayTradeRate,
    };
  }
  return result;
}

/**
 * 批次寫入擴展籌碼至 SQLite
 * @param {Record<string, { symbol: string, sblBalance?: number, marginBalance?: number, shortBalance?: number, dayTradeRate?: number }>} extMap
 * @param {string} dateStr
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTwExtendedChipsToSqlite(extMap, dateStr, customDbPath) {
  if (!extMap || typeof extMap !== 'object' || !dateStr) {
    return { savedCount: 0 };
  }

  const entries = Object.values(extMap);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_institutional_chips (
      symbol, date, sbl_balance, margin_balance, short_balance, day_trade_rate
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      sbl_balance = COALESCE(excluded.sbl_balance, tw_institutional_chips.sbl_balance),
      margin_balance = COALESCE(excluded.margin_balance, tw_institutional_chips.margin_balance),
      short_balance = COALESCE(excluded.short_balance, tw_institutional_chips.short_balance),
      day_trade_rate = COALESCE(excluded.day_trade_rate, tw_institutional_chips.day_trade_rate)
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of entries) {
      if (!item || !item.symbol) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(dateStr).trim(),
        item.sblBalance !== undefined ? Number(item.sblBalance) : null,
        item.marginBalance !== undefined ? Number(item.marginBalance) : null,
        item.shortBalance !== undefined ? Number(item.shortBalance) : null,
        item.dayTradeRate !== undefined ? Number(item.dayTradeRate) : null
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
  parseTwseSbl,
  parseTwseMargin,
  parseTwseDayTrade,
  saveTwExtendedChipsToSqlite,
};
