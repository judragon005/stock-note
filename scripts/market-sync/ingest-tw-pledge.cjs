/**
 * ingest-tw-pledge.cjs
 * 台股全市場董監事持股質押與內部人申報轉讓批次入庫模組 (Spec 0167 / Ticket 13)
 * 資料來源：政府資料開放平臺 / 公開資訊觀測站，100% 免費、免 API Key
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { stripOtcSuffix, fetchWithTimeout } = require('./market-sync-core.cjs');

const TWSE_PLEDGE_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap11_L';
const TPEX_PLEDGE_URL = 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap11_O';

/**
 * 計算質押比例 (百分比，保留一位小數)
 */
function computePledgeRatio(pledgedShares, totalShares) {
  if (!totalShares || totalShares <= 0) return 0;
  const ratio = (pledgedShares / totalShares) * 100;
  return Number.isFinite(ratio) ? Number(ratio.toFixed(1)) : 0;
}

/**
 * 民國年月/日期 (如 '11502'、'115/02'、'1150915') 或西元日期 ('2026-09'、'20260915') 轉化為 ISO 年月 (YYYY-MM)
 */
function convertRocToYearMonth(rocYearMonth) {
  if (!rocYearMonth) return '';
  const raw = String(rocYearMonth).trim();

  // 西元 YYYY-MM 或 YYYY/MM 或 YYYY-MM-DD
  const ceMatch = raw.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (ceMatch) {
    return `${ceMatch[1]}-${ceMatch[2].padStart(2, '0')}`;
  }

  // 民國 YYY/MM 或 YYY/MM/DD
  const rocSlashMatch = raw.match(/^(\d{2,3})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (rocSlashMatch) {
    const ceYear = parseInt(rocSlashMatch[1], 10) + 1911;
    return `${ceYear}-${rocSlashMatch[2].padStart(2, '0')}`;
  }

  const clean = raw.replace(/[^\d]/g, '').trim();
  if (clean.length < 5) return '';

  // 西元 8 碼 YYYYMMDD 或 6 碼 YYYYMM
  if (clean.length === 8 && parseInt(clean.slice(0, 4), 10) >= 1912) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}`;
  }
  if (clean.length === 6 && parseInt(clean.slice(0, 4), 10) >= 1912) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}`;
  }

  // 民國 7 碼 YYYMMDD (如 1150915 -> 2026-09)
  if (clean.length === 7) {
    const rocYear = parseInt(clean.slice(0, 3), 10);
    const month = clean.slice(3, 5);
    return `${rocYear + 1911}-${month.padStart(2, '0')}`;
  }

  // 民國 5 碼 YYYMM 或 4+ 碼 YYMM
  const rocYear = parseInt(clean.substring(0, clean.length - 2), 10);
  const month = clean.substring(clean.length - 2);
  const ceYear = rocYear + 1911;
  return `${ceYear}-${month.padStart(2, '0')}`;
}

/**
 * 解析董監事質押開放資料原始陣列（相容上市 TWSE t187ap11_L 與上櫃 TPEx mopsfin_t187ap11_O）
 */
function parseTwPledgeReport(rawData) {
  const list = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];
  if (list.length === 0) {
    return [];
  }

  const parseIntSafe = (val) => {
    if (val === null || val === undefined) return 0;
    const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const results = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;

    const rawSymbol = row['公司代號'] || row.SecuritiesCompanyCode || row.CompanyCode || row.Code || row.symbol || '';
    const symbol = stripOtcSuffix(rawSymbol);
    if (!symbol || symbol.length > 6) continue;

    const rawYm =
      row['出表年月'] ||
      row['資料年月'] ||
      row['出表日期'] ||
      row.YearMonth ||
      row.ReportDate ||
      row.Date ||
      '';
    const reportDate = convertRocToYearMonth(rawYm) || String(rawYm).trim();
    if (!reportDate) continue;

    const pledged = parseIntSafe(
      row['董監事設質股數'] ?? row['設質股數'] ?? row['董事設質股數'] ?? row.PledgedShares ?? 0
    );
    const totalDirector = parseIntSafe(
      row['董監事持有股數'] ??
        row['全體董事持有股數'] ??
        row['實際持有股數'] ??
        row['持股數'] ??
        row.DirectorShares ??
        row.ActualHoldingShares ??
        0
    );
    const transferShares = parseIntSafe(
      row['內部人申報轉讓股數'] ?? row['申報轉讓股數'] ?? row.TransferShares ?? 0
    );

    let pledgeRatio = computePledgeRatio(pledged, totalDirector);
    if (totalDirector <= 0) {
      const rawRatio = row['設質比例'] ?? row['質押比例'] ?? row.PledgeRatio;
      if (rawRatio !== undefined && rawRatio !== null && String(rawRatio).trim() !== '') {
        const parsedRatio = parseFloat(String(rawRatio).replace(/[,%]/g, '').trim());
        if (Number.isFinite(parsedRatio) && parsedRatio >= 0) {
          pledgeRatio = Number(parsedRatio.toFixed(1));
        }
      }
    }

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

/**
 * 聯網自證交所 (TWSE t187ap11_L) 與櫃買中心 (TPEx mopsfin_t187ap11_O) OpenAPI 抓取上市櫃董監設質月報並入庫
 * @param {string} [customDbPath]
 * @param {Function} [fetcher=fetch]
 * @param {{ logger?: Function, silent?: boolean }} [options]
 */
async function fetchAndIngestTwPledge(customDbPath, fetcher = fetch, options = {}) {
  const logWarn = (msg) => {
    if (options.silent) return;
    const logger = typeof options.logger === 'function' ? options.logger : console.warn;
    logger(`[ingest-tw-pledge] ${msg}`);
  };

  const sources = [
    { name: 'TWSE', url: TWSE_PLEDGE_URL },
    { name: 'TPEx', url: TPEX_PLEDGE_URL },
  ];

  const dedupedMap = new Map();
  const errors = [];
  let twseCount = 0;
  let tpexCount = 0;

  for (const src of sources) {
    try {
      const res = await fetchWithTimeout(src.url, {
        fetcher,
        timeoutMs: options.timeoutMs ?? 15000,
        signal: options.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'StockTracker/1.0 (local-sync)',
        },
      });

      if (!res || !res.ok) {
        const statusMsg = `${src.name} 抓取失敗: HTTP ${res?.status ?? 'UNKNOWN'}`;
        logWarn(statusMsg);
        errors.push(statusMsg);
        continue;
      }

      const data = typeof res.json === 'function' ? await res.json() : res;
      const records = parseTwPledgeReport(data);
      if (src.name === 'TWSE') twseCount = records.length;
      if (src.name === 'TPEx') tpexCount = records.length;

      for (const rec of records) {
        dedupedMap.set(`${rec.symbol}::${rec.reportDate}`, rec);
      }
    } catch (err) {
      const errMsg = `${src.name} 抓取異常 (${src.url}): ${err?.message || err}`;
      logWarn(errMsg);
      errors.push(errMsg);
    }
  }

  const mergedRecords = Array.from(dedupedMap.values());
  if (mergedRecords.length > 0) {
    const count = ingestTwPledgeToDb(mergedRecords, customDbPath);
    return {
      success: true,
      count,
      twseCount,
      tpexCount,
      errors,
    };
  }

  return {
    success: false,
    count: 0,
    twseCount,
    tpexCount,
    error: errors.length > 0 ? errors.join('; ') : 'NO_VALID_RECORDS',
    errors,
  };
}

module.exports = {
  TWSE_PLEDGE_URL,
  TPEX_PLEDGE_URL,
  computePledgeRatio,
  convertRocToYearMonth,
  parseTwPledgeReport,
  parseTpexPledgeReport: parseTwPledgeReport,
  ingestTwPledgeToDb,
  fetchAndIngestTwPledge,
};

