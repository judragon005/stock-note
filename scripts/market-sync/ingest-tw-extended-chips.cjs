/**
 * ingest-tw-extended-chips.cjs
 * 台股借券賣出 SBL、信用交易與當沖比率批次解析與入庫
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { parseCleanNumber } = require('./ingest-tw-quotes.cjs');
const { stripOtcSuffix } = require('./market-sync-core.cjs');

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
 * 解析 TPEx 櫃買中心 OpenAPI 融資融券餘額表 (tpex_mainboard_margin_balance)
 * @param {Array<object>|object} rawData
 * @returns {Record<string, { symbol: string, marginBalance: number, shortBalance: number }>}
 */
function parseTpexMargin(rawData) {
  const result = {};
  if (!rawData) return result;

  const list = Array.isArray(rawData) ? rawData : Array.isArray(rawData.data) ? rawData.data : [];
  if (!Array.isArray(list) || list.length === 0) return result;

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const symbol = stripOtcSuffix(item.SecuritiesCompanyCode || item.Code || item.symbol || '');
    if (!symbol || symbol.length > 6) continue;

    const marginBalance = parseCleanNumber(item.MarginPurchaseBalance);
    const shortBalance = parseCleanNumber(item.ShortSaleBalance);

    result[symbol] = {
      symbol,
      marginBalance,
      shortBalance,
    };
  }
  return result;
}

/**
 * 從 volumeMap 查找單一標的總成交股數（支援 number 或 { volume } 物件）
 * @param {Record<string, number | { volume?: number }> | null | undefined} volumeMap
 * @param {string} symbol
 * @returns {number}
 */
function resolveTotalVolume(volumeMap, symbol) {
  if (!volumeMap || typeof volumeMap !== 'object') return 0;
  const entry = volumeMap[symbol];
  if (typeof entry === 'number') return Number.isFinite(entry) && entry > 0 ? entry : 0;
  if (entry && typeof entry === 'object') {
    const vol = Number(entry.volume);
    return Number.isFinite(vol) && vol > 0 ? vol : 0;
  }
  return 0;
}

/**
 * 自 TWSE TWTB4U 原始結構選出含個股明細之資料表（優先 rawData.tables，向下相容 rawData.data）
 * @param {object} rawData
 * @returns {Array<{ fields: string[], data: any[] }>}
 */
function selectTwseDayTradeTables(rawData) {
  if (!rawData || typeof rawData !== 'object') return [];

  if (Array.isArray(rawData.tables)) {
    const validTables = rawData.tables.filter((t) => t && Array.isArray(t.data) && t.data.length > 0);
    // 1. 優先挑選表頭明確包含「證券代號」之個股明細表（自動排除「統計項目」摘要表）
    const bySymbolHeader = validTables.filter(
      (t) => Array.isArray(t.fields) && t.fields.some((f) => String(f).includes('證券代號'))
    );
    if (bySymbolHeader.length > 0) return bySymbolHeader;

    // 2. 次優先：表頭含「當日沖銷」/「當沖」且非摘要統計表
    const byDayTradeHeader = validTables.filter((t) => {
      if (!Array.isArray(t.fields)) return false;
      const isSummary = t.fields.some((f) => String(f).includes('統計項目'));
      const hasDtField = t.fields.some((f) => String(f).includes('當日沖銷') || String(f).includes('當沖'));
      return hasDtField && !isSummary;
    });
    if (byDayTradeHeader.length > 0) return byDayTradeHeader;

    // 3. 最後回退：標題含「當日沖銷」或任一含個股代碼列之 table
    const byStockRows = validTables.filter((t) =>
      t.data.some((row) => Array.isArray(row) && row.length >= 4 && /^[0-9][0-9A-Za-z]{1,5}$/.test(String(row[0]).trim()))
    );
    return byStockRows;
  }

  if (Array.isArray(rawData.data)) {
    return [{ fields: Array.isArray(rawData.fields) ? rawData.fields : [], data: rawData.data }];
  }

  return [];
}

/**
 * 解析 TWSE TWTB4U 當日沖銷交易標的及統計（優先支援 RWD rawData.tables，向下相容 rawData.data）
 * @param {object} rawData
 * @param {Record<string, number | { volume?: number }>} [volumeMap] - 選填：同日個股總成交股數對照表（如 MI_INDEX allQuotes）
 * @returns {Record<string, { symbol: string, dayTradeRate: number, dayTradeShares?: number, dayTradeBuyShares?: number, dayTradeSellShares?: number }>}
 */
function parseTwseDayTrade(rawData, volumeMap = null) {
  const result = {};
  const tables = selectTwseDayTradeTables(rawData);
  if (tables.length === 0) return result;

  for (const table of tables) {
    const fields = Array.isArray(table.fields) ? table.fields.map((f) => String(f).trim()) : [];
    const symbolIdx = fields.findIndex((f) => f.includes('證券代號') || f === '代號');
    const resolvedSymbolIdx = symbolIdx !== -1 ? symbolIdx : 0;

    const rateIdx = fields.findIndex((f) => f.includes('比率') || f.includes('當沖率') || f.includes('比例') || f.includes('%'));
    const totalVolIdx = fields.findIndex(
      (f) => f.includes('成交股數') && !f.includes('當日沖銷') && !f.includes('當沖')
    );
    const dtSharesIdx = fields.findIndex(
      (f) =>
        (f.includes('當日沖銷') || f.includes('當沖')) &&
        f.includes('股數') &&
        !f.includes('買進') &&
        !f.includes('賣出') &&
        !f.includes('比率') &&
        !f.includes('比例')
    );
    const dtBuySharesIdx = fields.findIndex((f) => f.includes('買進') && f.includes('股數'));
    const dtSellSharesIdx = fields.findIndex((f) => f.includes('賣出') && f.includes('股數'));

    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 4) continue;
      const symbol = stripOtcSuffix(row[resolvedSymbolIdx]);
      if (!symbol || symbol.length > 6 || !/^[0-9][0-9A-Za-z]{1,5}$/.test(symbol)) continue;

      const dayTradeBuyShares = dtBuySharesIdx !== -1 ? parseCleanNumber(row[dtBuySharesIdx]) : 0;
      const dayTradeSellShares = dtSellSharesIdx !== -1 ? parseCleanNumber(row[dtSellSharesIdx]) : 0;

      let dayTradeShares = 0;
      if (dtSharesIdx !== -1) {
        dayTradeShares = parseCleanNumber(row[dtSharesIdx]);
      } else if (dtBuySharesIdx !== -1 || dtSellSharesIdx !== -1) {
        dayTradeShares =
          dayTradeBuyShares > 0 && dayTradeSellShares > 0
            ? Math.round((dayTradeBuyShares + dayTradeSellShares) / 2)
            : Math.max(dayTradeBuyShares, dayTradeSellShares);
      } else if (fields.length === 0 && row.length >= 4) {
        dayTradeShares = parseCleanNumber(row[3]);
      }

      const rowTotalVol = totalVolIdx !== -1 ? parseCleanNumber(row[totalVolIdx]) : 0;
      const externalVol = resolveTotalVolume(volumeMap, symbol);
      const totalVolume = rowTotalVol > 0 ? rowTotalVol : externalVol;

      let rawRate = 0;
      if (rateIdx !== -1) {
        rawRate = parseCleanNumber(row[rateIdx]);
      } else if (totalVolume > 0 && dayTradeShares > 0) {
        rawRate = (dayTradeShares / totalVolume) * 100;
      } else if (fields.length === 0 && row.length >= 5) {
        // 舊版無表頭 5 欄格式：row[4] 為當沖比率(%)
        const legacyCandidate = parseCleanNumber(row[4]);
        if (legacyCandidate >= 0 && legacyCandidate <= 100) {
          rawRate = legacyCandidate;
        } else {
          const fallbackVol = parseCleanNumber(row[2]);
          rawRate = fallbackVol > 0 && dayTradeShares > 0 ? (dayTradeShares / fallbackVol) * 100 : 0;
        }
      }

      const safeRate = Number.isFinite(rawRate) ? Number(Math.min(100, Math.max(0, rawRate)).toFixed(2)) : 0;

      const entry = {
        symbol,
        dayTradeRate: safeRate,
        dayTradeShares,
      };
      if (dtBuySharesIdx !== -1) entry.dayTradeBuyShares = dayTradeBuyShares;
      if (dtSellSharesIdx !== -1) entry.dayTradeSellShares = dayTradeSellShares;

      result[symbol] = entry;
    }
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
      const toFiniteOrNull = (v) => (v !== undefined && v !== null && Number.isFinite(Number(v)) ? Number(v) : null);
      stmt.run(
        stripOtcSuffix(item.symbol),
        String(dateStr).trim(),
        toFiniteOrNull(item.sblBalance),
        toFiniteOrNull(item.marginBalance),
        toFiniteOrNull(item.shortBalance),
        toFiniteOrNull(item.dayTradeRate)
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
  stripOtcSuffix,
  parseTwseSbl,
  parseTwseMargin,
  parseTpexMargin,
  parseTwseDayTrade,
  saveTwExtendedChipsToSqlite,
};
