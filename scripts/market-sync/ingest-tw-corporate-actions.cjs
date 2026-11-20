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
    INSERT INTO corporate_action_calendar (
      symbol, market, action_type, ex_date, payment_date,
      cash_dividend_per_share, stock_dividend_ratio, split_ratio,
      reference_price, announcement_date, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, action_type, ex_date) DO UPDATE SET
      payment_date = COALESCE(excluded.payment_date, corporate_action_calendar.payment_date),
      cash_dividend_per_share = COALESCE(excluded.cash_dividend_per_share, corporate_action_calendar.cash_dividend_per_share),
      stock_dividend_ratio = COALESCE(excluded.stock_dividend_ratio, corporate_action_calendar.stock_dividend_ratio),
      split_ratio = COALESCE(excluded.split_ratio, corporate_action_calendar.split_ratio),
      reference_price = COALESCE(excluded.reference_price, corporate_action_calendar.reference_price),
      announcement_date = COALESCE(excluded.announcement_date, corporate_action_calendar.announcement_date),
      updated_at = excluded.updated_at
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
 * 解析 TWSE TWT49U 上市歷史除權息計算結果表 (Spec 0242)
 * 欄位索引：0:資料日期, 1:股票代號, 3:除權息前收盤價, 4:除權息參考價, 5:權值+息值, 6:權/息, 10:減除股利參考價
 */
function parseTwseTwt49uReport(rawData) {
  const rows = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
      ? rawData.data
      : [];
  if (rows.length === 0) return [];

  const results = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const exDate = convertRocToIsoDate(row[0]);
    const symbol = String(row[1] || '').trim().toUpperCase();
    if (!symbol || !exDate) continue;

    const prevClose = parseCleanDividend(row[3]);
    const refPrice = parseCleanDividend(row[4]);
    const combinedVal = parseCleanDividend(row[5]);
    const kind = String(row[6] || '').trim();
    const afterCashPrice = row.length > 10 ? parseCleanDividend(row[10]) : 0;

    let cashDiv = 0;
    let stockDivRatio = 0;

    if (kind === '息') {
      cashDiv = combinedVal;
    } else if (kind === '權') {
      if (prevClose > 0 && refPrice > 0 && prevClose > refPrice) {
        stockDivRatio = Number(((prevClose / refPrice) - 1).toFixed(6));
      }
    } else if (kind.includes('權') && kind.includes('息')) {
      if (prevClose > 0 && afterCashPrice > 0 && prevClose >= afterCashPrice) {
        cashDiv = Number((prevClose - afterCashPrice).toFixed(4));
      }
      if (afterCashPrice > 0 && refPrice > 0 && afterCashPrice > refPrice) {
        stockDivRatio = Number(((afterCashPrice / refPrice) - 1).toFixed(6));
      }
    } else if (combinedVal > 0) {
      cashDiv = combinedVal;
    }

    if (cashDiv <= 0 && stockDivRatio <= 0) continue;

    results.push({
      symbol,
      market: 'TW',
      actionType: 'DIVIDEND',
      exDate,
      cashDividendPerShare: Number(cashDiv.toFixed(4)),
      stockDividendRatio: Number(stockDivRatio.toFixed(6)),
      referencePrice: refPrice > 0 ? refPrice : undefined,
    });
  }
  return results;
}

/**
 * 解析 TPEx exDailyQ 上櫃歷史除權息結果表 (Spec 0242)
 * 欄位索引：0:除權息日期, 1:代號, 4:除權息參考價, 6:息值, 13:現金股利, 14:每仟股無償配股
 */
function parseTpexExDailyReport(rawData) {
  const rows = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.tables?.[0]?.data)
      ? rawData.tables[0].data
      : Array.isArray(rawData?.aaData)
        ? rawData.aaData
        : [];
  if (rows.length === 0) return [];

  const results = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const exDate = convertRocToIsoDate(row[0]);
    const symbol = String(row[1] || '').trim().toUpperCase();
    if (!symbol || !exDate) continue;

    const refPrice = parseCleanDividend(row[4]);
    const cashDivFromCol13 = row.length > 13 ? parseCleanDividend(row[13]) : 0;
    const cashDivFromCol6 = parseCleanDividend(row[6]);
    const cashDiv = cashDivFromCol13 > 0 ? cashDivFromCol13 : cashDivFromCol6;
    const freeSharesPer1000 = row.length > 14 ? parseCleanDividend(row[14]) : 0;
    const stockDivRatio = freeSharesPer1000 > 0 ? Number((freeSharesPer1000 / 1000).toFixed(6)) : 0;

    if (cashDiv <= 0 && stockDivRatio <= 0) continue;

    results.push({
      symbol,
      market: 'TW',
      actionType: 'DIVIDEND',
      exDate,
      cashDividendPerShare: Number(cashDiv.toFixed(4)),
      stockDividendRatio: stockDivRatio,
      referencePrice: refPrice > 0 ? refPrice : undefined,
    });
  }
  return results;
}

/**
 * 依年份抓取 TWSE 上市全市場除權息歷史結果 (TWT49U)
 */
async function fetchTwseHistoricalDividends(year, fetcher = globalThis.fetch, signal = undefined) {
  const url = `https://www.twse.com.tw/rwd/zh/exRight/TWT49U?startDate=${year}0101&endDate=${year}1231&response=json`;
  const res = await fetcher(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
    ...(signal ? { signal } : {}),
  });
  if (!res || !res.ok) return [];
  const json = await res.json();
  return parseTwseTwt49uReport(json);
}

/**
 * 依年份抓取 TPEx 上櫃全市場除權息歷史結果 (exDailyQ)
 */
async function fetchTpexHistoricalDividends(year, fetcher = globalThis.fetch, signal = undefined) {
  const url = `https://www.tpex.org.tw/www/zh-tw/bulletin/exDailyQ?startDate=${year}/01/01&endDate=${year}/12/31&response=json`;
  const res = await fetcher(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
    ...(signal ? { signal } : {}),
  });
  if (!res || !res.ok) return [];
  const json = await res.json();
  return parseTpexExDailyReport(json);
}

/**
 * 批次抓取並寫入台股全市場（上市 + 上櫃）歷年除權息完整歷史庫 (Spec 0242)
 */
async function runHistoricalCorporateActionsBackfill({
  years = 10,
  startYear,
  endYear,
  customDbPath,
  fetcher = globalThis.fetch,
  signal = undefined,
  delayMs = 250,
} = {}) {
  const currentYear = new Date().getFullYear();
  const toYear = endYear || currentYear;
  const fromYear = startYear || Math.max(2005, toYear - Math.max(1, years) + 1);

  let totalTwse = 0;
  let totalTpex = 0;
  let savedCount = 0;

  for (let y = fromYear; y <= toYear; y++) {
    if (signal?.aborted) break;
    const yearRecords = [];
    try {
      const twse = await fetchTwseHistoricalDividends(y, fetcher, signal);
      totalTwse += twse.length;
      yearRecords.push(...twse);
    } catch (err) {
      if (err?.name === 'AbortError') break;
      console.warn(`[CorporateActions] TWSE ${y} 年除權息拉取略過:`, err.message);
    }

    if (signal?.aborted) break;
    try {
      const tpex = await fetchTpexHistoricalDividends(y, fetcher, signal);
      totalTpex += tpex.length;
      yearRecords.push(...tpex);
    } catch (err) {
      if (err?.name === 'AbortError') break;
      console.warn(`[CorporateActions] TPEx ${y} 年除權息拉取略過:`, err.message);
    }

    if (yearRecords.length > 0) {
      savedCount += ingestCorporateActionsToDb(yearRecords, customDbPath);
    }
    if (delayMs > 0 && y < toYear && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { fromYear, toYear, totalTwse, totalTpex, savedCount };
}

/**
 * 聯網抓取並同步 TWSE 最新除權除息預告表 + 當年度上市櫃實績 (Spec 0242 升級)
 */
async function runCorporateActionsIngestion(customDbPath, { includeCurrentYearHistory = true } = {}) {
  const url = 'https://www.twse.com.tw/rwd/zh/exRight/TWT48U?response=json';
  let forecastCount = 0;
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
    forecastCount = ingestCorporateActionsToDb(records, customDbPath);
    console.log(`✔ [CorporateActions] 成功寫入 ${forecastCount} 筆已宣告除權除息行事曆至 corporate_action_calendar`);
  } catch (err) {
    console.warn(`[CorporateActions] 除權除息預告同步警告:`, err.message);
  }

  let currentYearCount = 0;
  if (includeCurrentYearHistory) {
    const thisYear = new Date().getFullYear();
    const res = await runHistoricalCorporateActionsBackfill({
      startYear: thisYear,
      endYear: thisYear,
      customDbPath,
      delayMs: 100,
    });
    currentYearCount = res.savedCount;
  }

  return forecastCount + currentYearCount;
}

if (require.main === module) {
  const yearsArg = process.argv.find((a) => a.startsWith('--years='));
  const years = yearsArg ? parseInt(yearsArg.split('=')[1], 10) || 10 : 10;
  runHistoricalCorporateActionsBackfill({ years })
    .then(async (summary) => {
      const forecast = await runCorporateActionsIngestion(undefined, { includeCurrentYearHistory: false });
      console.log(
        `✔ [CorporateActions Backfill] 完成 ${summary.fromYear}~${summary.toYear} 全市場除權息庫：TWSE ${summary.totalTwse} 筆 + TPEx ${summary.totalTpex} 筆 + 預告 ${forecast} 筆，共寫入 ${summary.savedCount + forecast} 筆。`
      );
    })
    .catch((err) => {
      console.error('[CorporateActions Backfill] 失敗:', err);
      process.exit(1);
    });
}

module.exports = {
  convertRocToIsoDate,
  parseCleanDividend,
  parseTwseExDividendReport,
  parseTwseTwt49uReport,
  parseTpexExDailyReport,
  fetchTwseHistoricalDividends,
  fetchTpexHistoricalDividends,
  ingestCorporateActionsToDb,
  runHistoricalCorporateActionsBackfill,
  runCorporateActionsIngestion,
};
