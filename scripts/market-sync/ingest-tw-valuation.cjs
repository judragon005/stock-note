/**
 * ingest-tw-valuation.cjs
 * 台股 TWSE / TPEx 官方每日個股估值 (PE / PB / 殖利率) 解析與湖倉入庫 (Spec 0196 / Ticket 02)
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { parseCleanNumber } = require('./ingest-tw-quotes.cjs');

/**
 * 安全轉換數值，若為 '-'、空字串或無效值則回傳 null
 * @param {any} val
 * @param {{ allowZero?: boolean }} [options]
 * @returns {number|null}
 */
function cleanValuationNumber(val, { allowZero = true } = {}) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str === 'N/A' || str === '--') return null;
  const num = parseCleanNumber(str);
  if (isNaN(num)) return null;
  if (!allowZero && num <= 0) return null;
  return num;
}

/**
 * 解析 TWSE BWIBBU_d 官方每日個股估值表
 * @param {object} rawData
 * @returns {Record<string, { symbol: string, pe: number|null, pb: number|null, dividendYield: number|null }>}
 */
function parseTwseBwibbu(rawData) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.data)) return result;

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const symbol = String(row[0]).trim();
    if (!symbol || symbol.length > 6) continue;

    // 0: 證券代號, 3: 殖利率(%), 5: 本益比, 6: 股價淨值比
    const dividendYield = cleanValuationNumber(row[3], { allowZero: true });
    const pe = cleanValuationNumber(row[5], { allowZero: false });
    const pb = cleanValuationNumber(row[6], { allowZero: false });

    result[symbol] = {
      symbol,
      pe,
      pb,
      dividendYield,
    };
  }
  return result;
}

/**
 * 解析 TPEx OpenAPI 每日個股本益比、殖利率與淨值比 (tpex_mainboard_peratio_analysis)
 * @param {Array<object>|object} rawData
 * @returns {Record<string, { symbol: string, pe: number|null, pb: number|null, dividendYield: number|null }>}
 */
function parseTpexPeratio(rawData) {
  const result = {};
  if (!rawData) return result;

  const list = Array.isArray(rawData) ? rawData : Array.isArray(rawData.data) ? rawData.data : [];
  if (!Array.isArray(list) || list.length === 0) return result;

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const symbol = String(item.SecuritiesCompanyCode || item.Code || item.symbol || '').trim();
    if (!symbol || symbol.length > 6) continue;

    const pe = cleanValuationNumber(item.PriceEarningRatio, { allowZero: false });
    const pb = cleanValuationNumber(item.PriceBookRatio, { allowZero: false });
    const dividendYield = cleanValuationNumber(item.YieldRatio, { allowZero: true });

    result[symbol] = {
      symbol,
      pe,
      pb,
      dividendYield,
    };
  }
  return result;
}

/**
 * 批次寫入官方每日估值至 SQLite tw_valuation_daily
 * @param {Record<string, { symbol: string, pe?: number|null, pb?: number|null, dividendYield?: number|null }>} valMap
 * @param {string} dateStr
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTwValuationToSqlite(valMap, dateStr, customDbPath) {
  if (!valMap || typeof valMap !== 'object' || !dateStr) {
    return { savedCount: 0 };
  }

  const entries = Object.values(valMap);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO tw_valuation_daily (
      symbol, date, pe, pb, dividend_yield, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      pe = excluded.pe,
      pb = excluded.pb,
      dividend_yield = excluded.dividend_yield,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of entries) {
      if (!item || !item.symbol) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(dateStr).trim(),
        item.pe !== undefined ? item.pe : null,
        item.pb !== undefined ? item.pb : null,
        item.dividendYield !== undefined ? item.dividendYield : null,
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
  cleanValuationNumber,
  parseTwseBwibbu,
  parseTpexPeratio,
  saveTwValuationToSqlite,
};
