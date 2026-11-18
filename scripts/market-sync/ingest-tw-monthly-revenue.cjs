/**
 * ingest-tw-monthly-revenue.cjs
 * 公開資訊觀測站 (MOPS) 全市場月營收成長與歷史新高入庫模組 (Spec 0163 / Ticket 07)
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { getLatestSettledRevenueMonth } = require('./market-freshness-service.cjs');

const TWSE_REVENUE_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L';
const TPEX_REVENUE_URL = 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O';

/**
 * 計算單一標的之月營收年增率 (YoY)、月增率 (MoM) 與是否創歷史新高
 * @param {number} currentRevenue - 當月營收
 * @param {number} [lastYearRevenue] - 去年同月營收
 * @param {number} [lastMonthRevenue] - 上月營收
 * @param {number[]} [pastRevenues] - 歷史所有月份營收清單
 * @returns {{ yoyRate: number | null, momRate: number | null, isAllTimeHigh: number }}
 */
function computeRevenueGrowth(currentRevenue, lastYearRevenue, lastMonthRevenue, pastRevenues = []) {
  if (currentRevenue === null || currentRevenue === undefined || isNaN(currentRevenue)) {
    return { yoyRate: null, momRate: null, isAllTimeHigh: 0 };
  }

  const cur = Number(currentRevenue);

  // YoY: (當月 - 去年同月) / 去年同月 * 100
  let yoyRate = null;
  if (lastYearRevenue !== null && lastYearRevenue !== undefined && Number(lastYearRevenue) > 0) {
    const ly = Number(lastYearRevenue);
    yoyRate = Number((((cur - ly) / ly) * 100).toFixed(2));
  }

  // MoM: (當月 - 上月) / 上月 * 100
  let momRate = null;
  if (lastMonthRevenue !== null && lastMonthRevenue !== undefined && Number(lastMonthRevenue) > 0) {
    const lm = Number(lastMonthRevenue);
    momRate = Number((((cur - lm) / lm) * 100).toFixed(2));
  }

  // 歷史新高：當月大於所有過去月份
  let isAllTimeHigh = 0;
  if (Array.isArray(pastRevenues) && pastRevenues.length > 0) {
    const validPast = pastRevenues.filter(v => v !== null && !isNaN(v) && Number(v) > 0);
    if (validPast.length > 0) {
      const maxPast = Math.max(...validPast);
      if (cur > maxPast) {
        isAllTimeHigh = 1;
      }
    }
  }

  return { yoyRate, momRate, isAllTimeHigh };
}

/**
 * 將月營收批次寫入 SQLite tw_monthly_revenue
 * @param {Record<string, { symbol: string, yearMonth: string, revenue: number, lastYearRevenue?: number, yoyRate?: number, momRate?: number, isAllTimeHigh?: number }>} revenueMap
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveMonthlyRevenueToSqlite(revenueMap, customDbPath) {
  if (!revenueMap || typeof revenueMap !== 'object') {
    return { savedCount: 0 };
  }

  const entries = Object.values(revenueMap);
  if (entries.length === 0) return { savedCount: 0 };

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_monthly_revenue (
      symbol, year_month, revenue, last_year_revenue, yoy_rate, mom_rate, is_all_time_high, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, year_month) DO UPDATE SET
      revenue = excluded.revenue,
      last_year_revenue = excluded.last_year_revenue,
      yoy_rate = excluded.yoy_rate,
      mom_rate = excluded.mom_rate,
      is_all_time_high = excluded.is_all_time_high,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  const now = Date.now();
  try {
    for (const item of entries) {
      if (!item || !item.symbol || !item.yearMonth) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(item.yearMonth).trim(),
        Number(item.revenue) || 0,
        item.lastYearRevenue !== undefined ? Number(item.lastYearRevenue) : null,
        item.yoyRate !== undefined ? Number(item.yoyRate) : null,
        item.momRate !== undefined ? Number(item.momRate) : null,
        item.isAllTimeHigh !== undefined ? Number(item.isAllTimeHigh) : 0,
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

/**
 * 將民國年月 (如 "11508" 或 "115/08") 轉換為西元 YYYY-MM
 * @param {string} rocYm
 * @returns {string | null}
 */
function convertRocYmToIso(rocYm) {
  if (!rocYm) return null;
  const cleaned = String(rocYm).trim();
  if (/^\d{4}-\d{2}$/.test(cleaned)) return cleaned;

  const digits = cleaned.replace(/[^\d]/g, '');
  if (digits.length >= 4 && digits.length <= 5) {
    const rocYear = parseInt(digits.slice(0, digits.length - 2), 10);
    const month = digits.slice(-2);
    const mm = parseInt(month, 10);
    if (rocYear > 0 && mm >= 1 && mm <= 12) {
      return `${rocYear + 1911}-${month}`;
    }
  }
  return null;
}

/**
 * 解析 TWSE / TPEx OpenAPI 月營收陣列資料
 * @param {Array<Record<string, any>>} records
 * @param {string} [fallbackYearMonth]
 * @returns {Array<{ symbol: string, yearMonth: string, revenue: number, lastYearRevenue: number | null, yoyRate: number | null, momRate: number | null, isAllTimeHigh: number }>}
 */
function parseMonthlyRevenueOpenApi(records, fallbackYearMonth) {
  if (!Array.isArray(records)) return [];
  const parsed = [];

  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    const symbol = String(r['公司代號'] || r.SecuritiesCompanyCode || '').trim();
    if (!symbol) continue;

    const yearMonth = convertRocYmToIso(r['資料年月']) || fallbackYearMonth;
    if (!yearMonth) continue;

    const revRaw = String(r['營業收入-當月營收'] ?? '').replace(/,/g, '').trim();
    const revenue = Number(revRaw);
    if (!Number.isFinite(revenue) || revenue < 0) continue;

    const lyRaw = String(r['營業收入-去年當月營收'] ?? '').replace(/,/g, '').trim();
    const lastYearRevenue = lyRaw !== '' && Number.isFinite(Number(lyRaw)) ? Number(lyRaw) : null;

    const lmRaw = String(r['營業收入-上月營收'] ?? '').replace(/,/g, '').trim();
    const lastMonthRevenue = lmRaw !== '' && Number.isFinite(Number(lmRaw)) ? Number(lmRaw) : null;

    const yoyRaw = String(r['營業收入-去年同月增減(%)'] ?? '').replace(/,/g, '').trim();
    const momRaw = String(r['營業收入-上月比較增減(%)'] ?? '').replace(/,/g, '').trim();

    const computed = computeRevenueGrowth(revenue, lastYearRevenue, lastMonthRevenue);
    const yoyRate = yoyRaw !== '' && Number.isFinite(Number(yoyRaw)) ? Number(Number(yoyRaw).toFixed(2)) : computed.yoyRate;
    const momRate = momRaw !== '' && Number.isFinite(Number(momRaw)) ? Number(Number(momRaw).toFixed(2)) : computed.momRate;

    parsed.push({
      symbol,
      yearMonth,
      revenue,
      lastYearRevenue,
      yoyRate,
      momRate,
      isAllTimeHigh: 0,
    });
  }

  return parsed;
}

/**
 * 清除舊版由 Math.sin/Math.cos 產生的合成月營收假資料
 * @param {string} [customDbPath]
 * @returns {{ deletedCount: number }}
 */
function purgeSyntheticRecords(customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const rows = db
    .prepare('SELECT rowid, symbol, yoy_rate, mom_rate FROM tw_monthly_revenue')
    .all();

  const syntheticRowIds = [];
  for (const r of rows) {
    if (r.yoy_rate === null || r.mom_rate === null) continue;
    const seed = parseInt(String(r.symbol).replace(/\D/g, '') || '1000', 10);
    let matched = false;
    for (let m = 0; m < 12; m++) {
      const expectedYoy = Number((((seed % 40) - 10) + Math.cos(m + (seed % 7)) * 12).toFixed(2));
      const expectedMom = Number((((seed % 20) - 8) + Math.sin(m + (seed % 3)) * 6).toFixed(2));
      if (Math.abs(r.yoy_rate - expectedYoy) <= 0.01 && Math.abs(r.mom_rate - expectedMom) <= 0.01) {
        matched = true;
        break;
      }
    }
    if (matched) {
      syntheticRowIds.push(r.rowid);
    }
  }

  if (syntheticRowIds.length === 0) return { deletedCount: 0 };

  const delStmt = db.prepare('DELETE FROM tw_monthly_revenue WHERE rowid = ?');
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const id of syntheticRowIds) {
      delStmt.run(id);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { deletedCount: syntheticRowIds.length };
}

/**
 * 執行全市場台股上市櫃月營收真實資料抓取與入庫 (Spec 0237 Ticket 01)
 * 離線或抓取失敗時回傳 { savedCount: 0 }，嚴禁寫入任何合成假資料
 * @param {string} [customDbPath]
 * @param {string | { targetYearMonth?: string, fetcher?: Function, purgeSynthetic?: boolean }} [targetYearMonthOrOptions]
 * @param {number} [backfillMonths]
 * @param {{ targetYearMonth?: string, fetcher?: Function, purgeSynthetic?: boolean }} [options]
 * @returns {Promise<{ savedCount: number, yearMonth: string, monthsCount: number }>}
 */
async function runMonthlyRevenueIngestion(customDbPath, targetYearMonthOrOptions, backfillMonths, options) {
  const opts =
    typeof targetYearMonthOrOptions === 'object' && targetYearMonthOrOptions !== null
      ? targetYearMonthOrOptions
      : options || {};
  const explicitYm = typeof targetYearMonthOrOptions === 'string' ? targetYearMonthOrOptions : opts.targetYearMonth;
  const baseYearMonth = explicitYm || getLatestSettledRevenueMonth();
  const fetcher = opts.fetcher || globalThis.fetch;

  const db = initSqliteLakehouseDb(customDbPath);
  const symbols = db.prepare("SELECT symbol FROM symbols_meta WHERE market = 'TW'").all();
  if (symbols.length === 0 || typeof fetcher !== 'function') {
    return { savedCount: 0, yearMonth: baseYearMonth, monthsCount: 0 };
  }

  const fetchJsonSafe = async (url) => {
    try {
      const res = await fetcher(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'StockTracker/1.0 (local-sync)',
        },
      });
      if (!res || !res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const [twseData, tpexData] = await Promise.all([
    fetchJsonSafe(TWSE_REVENUE_URL),
    fetchJsonSafe(TPEX_REVENUE_URL),
  ]);

  const parsedAll = [
    ...parseMonthlyRevenueOpenApi(twseData, explicitYm),
    ...parseMonthlyRevenueOpenApi(tpexData, explicitYm),
  ];

  if (parsedAll.length === 0) {
    return { savedCount: 0, yearMonth: baseYearMonth, monthsCount: 0 };
  }

  const registeredSet = new Set(symbols.map((s) => String(s.symbol).trim()));
  const revenueMap = {};
  let effectiveYearMonth = explicitYm || baseYearMonth;

  for (const item of parsedAll) {
    if (!registeredSet.has(item.symbol)) continue;
    const ym = explicitYm || item.yearMonth;
    effectiveYearMonth = ym;
    revenueMap[item.symbol] = {
      ...item,
      yearMonth: ym,
    };
  }

  if (Object.keys(revenueMap).length === 0) {
    return { savedCount: 0, yearMonth: effectiveYearMonth, monthsCount: 0 };
  }

  if (opts.purgeSynthetic !== false) {
    purgeSyntheticRecords(customDbPath);
  }

  const { savedCount } = saveMonthlyRevenueToSqlite(revenueMap, customDbPath);
  return { savedCount, yearMonth: effectiveYearMonth, monthsCount: savedCount > 0 ? 1 : 0 };
}

/**
 * 單一非 ETF 台股個股月營收歷史序列按需補齊 (Spec 0241 Ticket 03)
 * 當 tw_monthly_revenue 筆數 < 6 時，從 FinMind TaiwanStockMonthRevenue 拉取近 N 個月資料並計算 YoY/MoM 寫入
 * @param {string} symbol
 * @param {number} [months=12]
 * @param {string} [customDbPath]
 * @param {Function} [fetcher]
 * @returns {Promise<{ savedCount: number, skipped?: boolean }>}
 */
async function backfillSymbolMonthlyRevenue(symbol, months = 12, customDbPath, fetcher = globalThis.fetch) {
  if (!symbol || typeof fetcher !== 'function') {
    return { savedCount: 0 };
  }

  const cleanSymbol = String(symbol).trim().toUpperCase();
  const aliasSym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : `${cleanSymbol}O`;

  if (/^00/.test(cleanSymbol)) {
    return { savedCount: 0, skipped: true };
  }

  try {
    const db = initSqliteLakehouseDb(customDbPath);
    const metaRow = db
      .prepare('SELECT type FROM symbols_meta WHERE symbol IN (?, ?)')
      .get(cleanSymbol, aliasSym);
    if (metaRow?.type === 'ETF') {
      return { savedCount: 0, skipped: true };
    }

    const existingRow = db
      .prepare('SELECT COUNT(*) AS count FROM tw_monthly_revenue WHERE symbol IN (?, ?)')
      .get(cleanSymbol, aliasSym);
    if (Number(existingRow?.count || 0) >= 6) {
      return { savedCount: 0, skipped: true };
    }

    const startDateObj = new Date(Date.now() - (months + 14) * 31 * 86400000);
    const startDate = startDateObj.toISOString().slice(0, 10);
    const querySym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : cleanSymbol;
    const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockMonthRevenue&data_id=${encodeURIComponent(querySym)}&start_date=${startDate}`;

    const res = await fetcher(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'StockTracker/1.0 (local-sync)' },
    });
    if (!res || !res.ok) return { savedCount: 0 };

    const json = await res.json();
    const rawRows = Array.isArray(json?.data) ? json.data : [];
    if (rawRows.length === 0) return { savedCount: 0 };

    const byYm = {};
    for (const r of rawRows) {
      if (!r) continue;
      let ym = null;
      if (r.revenue_year && r.revenue_month) {
        ym = `${r.revenue_year}-${String(r.revenue_month).padStart(2, '0')}`;
      } else if (r.date) {
        ym = String(r.date).slice(0, 7);
      }
      if (!ym || !/^\d{4}-\d{2}$/.test(ym)) continue;

      const rev = Number(r.revenue);
      if (!Number.isFinite(rev) || rev < 0) continue;
      byYm[ym] = rev;
    }

    const sortedYms = Object.keys(byYm).sort();
    if (sortedYms.length === 0) return { savedCount: 0 };

    const targetYms = sortedYms.slice(-months);
    const revenueMap = {};

    for (const ym of targetYms) {
      const [yStr, mStr] = ym.split('-');
      const yNum = Number(yStr);
      const mNum = Number(mStr);
      const lyYm = `${yNum - 1}-${mStr}`;
      const lmYm = mNum === 1 ? `${yNum - 1}-12` : `${yNum}-${String(mNum - 1).padStart(2, '0')}`;

      const curRev = byYm[ym];
      const lyRev = byYm[lyYm] !== undefined ? byYm[lyYm] : null;
      const lmRev = byYm[lmYm] !== undefined ? byYm[lmYm] : null;
      const pastRevs = sortedYms.filter((d) => d < ym).map((d) => byYm[d]);

      const { yoyRate, momRate, isAllTimeHigh } = computeRevenueGrowth(curRev, lyRev, lmRev, pastRevs);
      revenueMap[`${cleanSymbol}_${ym}`] = {
        symbol: cleanSymbol,
        yearMonth: ym,
        revenue: curRev,
        lastYearRevenue: lyRev,
        yoyRate,
        momRate,
        isAllTimeHigh,
      };
    }

    const { savedCount } = saveMonthlyRevenueToSqlite(revenueMap, customDbPath);
    return { savedCount };
  } catch {
    return { savedCount: 0 };
  }
}

module.exports = {
  TWSE_REVENUE_URL,
  TPEX_REVENUE_URL,
  convertRocYmToIso,
  parseMonthlyRevenueOpenApi,
  computeRevenueGrowth,
  saveMonthlyRevenueToSqlite,
  purgeSyntheticRecords,
  runMonthlyRevenueIngestion,
  backfillSymbolMonthlyRevenue,
};

if (require.main === module) {
  console.log('📈 [Monthly Revenue Ingestion] 啟動全市場台股月營收成長數據入庫 (Spec 0164)...');
  runMonthlyRevenueIngestion()
    .then(({ savedCount, yearMonth }) => {
      console.log(`✔ 成功入庫 ${savedCount.toLocaleString()} 檔台股月營收數據 (年月: ${yearMonth}) 至 tw_monthly_revenue！`);
    })
    .catch((err) => {
      console.error('❌ 月營收入庫失敗:', err);
      process.exit(1);
    });
}
