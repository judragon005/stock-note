/**
 * ingest-tw-corporate-actions.cjs
 * 台股官方除權除息預告日程批次入庫模組 (Spec 0167 / Ticket 11)
 * 來源：TWSE OpenAPI (TWT48U) 與 TPEX OpenAPI，100% 免費、免 API Key
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 民國年月日 (如 '1150318' 或 '115/03/18') 轉化為 ISO 日期 (YYYY-MM-DD)
 */
function convertRocToIsoDate(rocDateStr) {
  if (!rocDateStr) return '';
  const clean = String(rocDateStr).replace(/[^\d]/g, '').trim();
  if (clean.length < 6) return '';

  let rocYear, month, day;
  if (clean.length === 7) {
    rocYear = parseInt(clean.substring(0, 3), 10);
    month = clean.substring(3, 5);
    day = clean.substring(5, 7);
  } else if (clean.length === 6) {
    rocYear = parseInt(clean.substring(0, 2), 10);
    month = clean.substring(2, 4);
    day = clean.substring(4, 6);
  } else {
    return '';
  }

  const ceYear = rocYear + 1911;
  return `${ceYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * 解析 TWSE TWT48U 除權除息預告表原始數據
 */
function parseTwseExDividendReport(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  const results = [];
  for (const row of rawData) {
    if (!row || typeof row !== 'object') continue;

    const symbol = String(row.Code || row['證券代號'] || '').trim();
    if (!symbol) continue;

    const rawExDate = row.Date || row['除權息日期'] || '';
    const exDate = convertRocToIsoDate(rawExDate);
    if (!exDate) continue;

    const rawPayDate = row.PaymentDate || row['現金股利發放日'] || '';
    const paymentDate = convertRocToIsoDate(rawPayDate) || undefined;

    const cashDiv = parseFloat(String(row['Dividend(Cash)'] || row['權利分派內容-現金股利'] || 0));
    const stockDiv = parseFloat(String(row['Dividend(Stock)'] || row['權利分派內容-無償配股率'] || 0));

    results.push({
      symbol,
      market: 'TW',
      actionType: 'DIVIDEND',
      exDate,
      paymentDate,
      cashDividendPerShare: isNaN(cashDiv) ? 0 : cashDiv,
      stockDividendRatio: isNaN(stockDiv) ? 0 : stockDiv,
    });
  }

  return results;
}

/**
 * 批次寫入 Lakehouse SQLite corporate_action_calendar 表
 */
function ingestCorporateActionsToDb(records, customDbPath) {
  if (!Array.isArray(records) || records.length === 0) return 0;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO corporate_action_calendar (
      symbol, market, action_type, ex_date, payment_date,
      cash_dividend_per_share, stock_dividend_ratio, split_ratio,
      reference_price, announcement_date, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  let count = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of records) {
      stmt.run(
        r.symbol,
        r.market,
        r.actionType,
        r.exDate,
        r.paymentDate || null,
        r.cashDividendPerShare ?? null,
        r.stockDividendRatio ?? null,
        r.splitRatio ?? null,
        r.referencePrice ?? null,
        r.announcementDate || null,
        now
      );
      count++;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return count;
}

module.exports = {
  convertRocToIsoDate,
  parseTwseExDividendReport,
  ingestCorporateActionsToDb,
};
