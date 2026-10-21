/**
 * ingest-tw-corporate-actions.cjs
 * 台股官方除權除息預告日程批次入庫模組 (Spec 0167 / Ticket 11 & Spec 0198 / Ticket 02)
 * 來源：TWSE RWD (TWT48U)，100% 免費、免 API Key、零第三方相依
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 民國年月日 (如 '1150318', '115/03/18' 或 '115年11月06日') 轉化為 ISO 日期 (YYYY-MM-DD)
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
 * 安全解析現金或股票股利數值
 */
function parseCleanDividend(val) {
  if (val === undefined || val === null) return 0;
  const str = String(val).replace(/<[^>]*>/g, '').replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * 解析 TWSE TWT48U 除權除息預告表原始數據 (支援 RWD 二維陣列與物件陣列)
 */
function parseTwseExDividendReport(rawData) {
  if (!rawData) return [];

  const rows = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData.data)
      ? rawData.data
      : [];

  if (rows.length === 0) return [];

  const results = [];
  for (const row of rows) {
    if (!row) continue;

    let symbol = '';
    let exDate = '';
    let paymentDate = undefined;
    let cashDiv = 0;
    let stockDiv = 0;

    if (Array.isArray(row)) {
      // TWSE RWD 二維陣列:
      // 0: 除權除息日期, 1: 股票代號, 2: 名稱, 3: 除權息, 4: 無償配股率, 7: 現金股利
      if (row.length < 5) continue;
      symbol = String(row[1] || '').trim();
      exDate = convertRocToIsoDate(row[0]);
      stockDiv = parseCleanDividend(row[4]);
      cashDiv = parseCleanDividend(row[7]);
    } else if (typeof row === 'object') {
      symbol = String(row.Code || row['證券代號'] || '').trim();
      exDate = convertRocToIsoDate(row.Date || row['除權息日期'] || '');
      paymentDate = convertRocToIsoDate(row.PaymentDate || row['現金股利發放日'] || '') || undefined;
      cashDiv = parseCleanDividend(row['Dividend(Cash)'] || row['權利分派內容-現金股利']);
      stockDiv = parseCleanDividend(row['Dividend(Stock)'] || row['權利分派內容-無償配股率']);
    }

    if (!symbol || !exDate) continue;

    results.push({
      symbol,
      market: 'TW',
      actionType: 'DIVIDEND',
      exDate,
      paymentDate,
      cashDividendPerShare: cashDiv,
      stockDividendRatio: stockDiv,
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

/**
 * 聯網抓取並同步 TWSE 最新除權除息預告表 (一鍵執行)
 */
async function runCorporateActionsIngestion(customDbPath) {
  const url = 'https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP 異常 ${res.status}`);
    }
    const json = await res.json();
    const records = parseTwseExDividendReport(json);
    const count = ingestCorporateActionsToDb(records, customDbPath);
    console.log(`✔ [CorporateActions] 成功寫入 ${count} 筆已宣告除權除息行事曆至 corporate_action_calendar`);
    return count;
  } catch (err) {
    console.warn(`[CorporateActions] 除權除息同步警告:`, err.message);
    return 0;
  }
}

module.exports = {
  convertRocToIsoDate,
  parseCleanDividend,
  parseTwseExDividendReport,
  ingestCorporateActionsToDb,
  runCorporateActionsIngestion,
};
