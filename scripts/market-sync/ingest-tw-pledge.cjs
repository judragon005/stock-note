/**
 * ingest-tw-pledge.cjs
 * 台股全市場董監事持股質押與內部人申報轉讓批次入庫模組 (Spec 0167 / Ticket 13)
 * 資料來源：政府資料開放平臺 / 公開資訊觀測站，100% 免費、免 API Key
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 計算質押比例 (百分比，保留一位小數)
 */
function computePledgeRatio(pledgedShares, totalShares) {
  if (!totalShares || totalShares <= 0) return 0;
  const ratio = (pledgedShares / totalShares) * 100;
  return Number(ratio.toFixed(1));
}

/**
 * 民國年月 (如 '11502' 或 '115/02') 轉化為 ISO 年月 (YYYY-MM)
 */
function convertRocToYearMonth(rocYearMonth) {
  if (!rocYearMonth) return '';
  const clean = String(rocYearMonth).replace(/[^\d]/g, '').trim();
  if (clean.length < 5) return '';

  const rocYear = parseInt(clean.substring(0, clean.length - 2), 10);
  const month = clean.substring(clean.length - 2);
  const ceYear = rocYear + 1911;
  return `${ceYear}-${month.padStart(2, '0')}`;
}

/**
 * 解析董監事質押開放資料原始陣列
 */
function parseTwPledgeReport(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  const results = [];
  for (const row of rawData) {
    if (!row || typeof row !== 'object') continue;

    const symbol = String(row['公司代號'] || row.CompanyCode || row.Code || '').trim();
    if (!symbol) continue;

    const rawYm = row['出表年月'] || row.YearMonth || '';
    const reportDate = convertRocToYearMonth(rawYm) || String(rawYm);
    if (!reportDate) continue;

    const pledged = parseInt(String(row['董監事設質股數'] || row.PledgedShares || 0).replace(/,/g, ''), 10) || 0;
    const totalDirector = parseInt(String(row['董監事持有股數'] || row.DirectorShares || 0).replace(/,/g, ''), 10) || 0;
    const transferShares = parseInt(String(row['內部人申報轉讓股數'] || row.TransferShares || 0).replace(/,/g, ''), 10) || 0;

    const pledgeRatio = computePledgeRatio(pledged, totalDirector);

    results.push({
      symbol,
      reportDate,
      pledgedShares: pledged,
      totalDirectorShares: totalDirector,
      pledgeRatio,
      insiderTransferShares: transferShares,
    });
  }

  return results;
}

/**
 * 批次寫入 Lakehouse SQLite tw_insider_pledge_records 表
 */
function ingestTwPledgeToDb(records, customDbPath) {
  if (!Array.isArray(records) || records.length === 0) return 0;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tw_insider_pledge_records (
      symbol, report_date, pledged_shares, total_director_shares,
      pledge_ratio, insider_transfer_shares, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  let count = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of records) {
      stmt.run(
        r.symbol,
        r.reportDate,
        r.pledgedShares,
        r.totalDirectorShares,
        r.pledgeRatio,
        r.insiderTransferShares,
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
  computePledgeRatio,
  convertRocToYearMonth,
  parseTwPledgeReport,
  ingestTwPledgeToDb,
};
