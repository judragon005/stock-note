/**
 * ingest-tw-etf-meta.cjs
 * 台股全市場 ETF 元數據與實時費用率雙軌湖倉攝取器 (Spec 0241 T03 / Debt 0061 #3)
 * - 軌道 1：TWSE OpenAPI t187ap47_L 官方上市 ETF 基本資料 (基金類型、追蹤指數、上市日、保管機構)
 * - 軌道 2：Yahoo Finance Crumb quoteSummary 按需自癒年化總費用率 (.TW/.TWO 後綴保護 + 30D TTL + UNAVAILABLE 負快取)
 */

const { stripOtcSuffix } = require('./market-sync-core.cjs');

const ETF_META_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CRUMB_TTL_MS = 6 * 60 * 60 * 1000;
const TWSE_ETF_OPENAPI_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap47_L';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

let cachedCookie = '';
let cachedCrumb = '';
let crumbFetchedAt = 0;

function resetTwEtfMetaStateForTest() {
  cachedCookie = '';
  cachedCrumb = '';
  crumbFetchedAt = 0;
}

/**
 * 產生台股 ETF 的 Yahoo Finance 候選代碼（嚴格保留 .TW / .TWO 後綴，不誤轉為連字號）
 * 台股債券 ETF (結尾為 B，多掛牌櫃買) 優先嘗試 .TWO，其餘優先 .TW。
 */
function formatTwYahooEtfCandidates(symbol) {
  const clean = stripOtcSuffix(String(symbol || '').trim().toUpperCase()).replace(/\.(TW|TWO)$/i, '');
  if (!clean) return [];
  if (/^00\d{3,4}B$/i.test(clean)) {
    return [`${clean}.TWO`, `${clean}.TW`];
  }
  return [`${clean}.TW`, `${clean}.TWO`];
}

/**
 * 解析證交所 OpenAPI t187ap47_L (上市 ETF 基本資料)
 */
function parseTwseEtfOpenApiMeta(rawList) {
  if (!Array.isArray(rawList)) return [];
  const results = [];
  for (const item of rawList) {
    const symbol = String(item['基金代號'] || '').trim().toUpperCase();
    if (!symbol) continue;
    const rawIdx = String(item['標的指數/追蹤指數名稱'] || '').trim();
    results.push({
      symbol,
      name: String(item['基金簡稱'] || item['基金中文名稱'] || '').trim() || null,
      fundType: String(item['基金類型'] || '').trim() || null,
      trackingIndex: rawIdx && rawIdx !== '不適用' ? rawIdx : null,
      listingDate: String(item['上市日期'] || '').trim() || null,
      custodian: String(item['保管機構'] || '').trim() || null,
    });
  }
  return results;
}

/**
 * 批次抓取並寫入 TWSE OpenAPI t187ap47_L（不覆寫既有實時費用率）
 */
async function fetchAndIngestTwseEtfOpenApiMeta(db, { fetcher = globalThis.fetch, signal } = {}) {
  if (!db || typeof fetcher !== 'function') return { success: false, count: 0 };
  try {
    const res = await fetcher(TWSE_ETF_OPENAPI_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal,
    });
    if (!res || !res.ok) return { success: false, count: 0 };
    const json = await res.json();
    const rows = parseTwseEtfOpenApiMeta(json);
    if (rows.length === 0) return { success: false, count: 0 };

    const stmt = db.prepare(`
      INSERT INTO etf_meta (
        symbol, name, fund_type, tracking_index, listing_date, custodian, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        name = COALESCE(excluded.name, etf_meta.name),
        fund_type = COALESCE(excluded.fund_type, etf_meta.fund_type),
        tracking_index = COALESCE(excluded.tracking_index, etf_meta.tracking_index),
        listing_date = COALESCE(excluded.listing_date, etf_meta.listing_date),
        custodian = COALESCE(excluded.custodian, etf_meta.custodian)
    `);
    const now = Date.now();
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const r of rows) {
        stmt.run(r.symbol, r.name, r.fundType, r.trackingIndex, r.listingDate, r.custodian, now);
      }
      db.exec('COMMIT;');
      return { success: true, count: rows.length };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return { success: false, count: 0, aborted: true };
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

async function getYahooCrumbSession(fetcher, signal) {
  const now = Date.now();
  if (cachedCookie && cachedCrumb && now - crumbFetchedAt < CRUMB_TTL_MS) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }
  const cRes = await fetcher('https://fc.yahoo.com', {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });
  const setCookieHeader =
    typeof cRes?.headers?.getSetCookie === 'function'
      ? cRes.headers.getSetCookie().join('; ')
      : cRes?.headers?.get?.('set-cookie') || '';
  const cookie = String(setCookieHeader)
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
  if (!cookie) return null;

  const crumbRes = await fetcher('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': USER_AGENT, Cookie: cookie },
    signal,
  });
  if (!crumbRes || !crumbRes.ok) return null;
  const crumb = String(await crumbRes.text()).trim();
  if (!crumb) return null;

  cachedCookie = cookie;
  cachedCrumb = crumb;
  crumbFetchedAt = now;
  return { cookie, crumb };
}

function extractYahooExpenseRatioPct(resultObj) {
  const raw =
    resultObj?.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio?.raw ??
    resultObj?.fundProfile?.feesExpensesInvestment?.netExpRatio?.raw ??
    resultObj?.defaultKeyStatistics?.annualReportExpenseRatio?.raw;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  // Yahoo 原始值為小數 (0.0032 => 0.32%)
  return Number((raw * 100).toFixed(4));
}

/**
 * 查詢或按需補齊單檔台股 ETF 元數據與實時費用率（30D TTL + UNAVAILABLE 負快取）
 */
async function getOrFetchTwEtfMeta(
  db,
  symbol,
  { fetcher = globalThis.fetch, signal, ttlMs = ETF_META_TTL_MS } = {}
) {
  if (!db || !symbol) return null;
  const cleanSym = stripOtcSuffix(String(symbol).trim().toUpperCase()).replace(/\.(TW|TWO)$/i, '');
  if (!cleanSym) return null;

  let existing = null;
  try {
    existing = db.prepare('SELECT * FROM etf_meta WHERE symbol = ?').get(cleanSym) || null;
  } catch {
    return null;
  }

  const now = Date.now();
  if (
    existing &&
    existing.expense_source &&
    typeof existing.updated_at === 'number' &&
    now - existing.updated_at < ttlMs
  ) {
    return existing;
  }

  if (typeof fetcher !== 'function' || signal?.aborted) {
    return existing;
  }

  try {
    const session = await getYahooCrumbSession(fetcher, signal);
    if (!session) return existing;

    const candidates = formatTwYahooEtfCandidates(cleanSym);
    let matchedResult = null;
    for (const candidate of candidates) {
      if (signal?.aborted) return existing;
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(candidate)}?modules=fundProfile,defaultKeyStatistics&crumb=${encodeURIComponent(session.crumb)}`;
      const res = await fetcher(url, {
        headers: { 'User-Agent': USER_AGENT, Cookie: session.cookie },
        signal,
      });
      if (!res || !res.ok) continue;
      const payload = await res.json();
      const first = payload?.quoteSummary?.result?.[0];
      if (first) {
        matchedResult = first;
        break;
      }
    }

    if (!matchedResult) return existing;

    const expenseRatioPct = extractYahooExpenseRatioPct(matchedResult);
    const issuer = String(matchedResult?.fundProfile?.family || '').trim() || null;
    const expenseSource = expenseRatioPct !== null ? 'YAHOO' : 'UNAVAILABLE';

    db.prepare(`
      INSERT INTO etf_meta (symbol, issuer, expense_ratio, expense_source, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        issuer = COALESCE(excluded.issuer, etf_meta.issuer),
        expense_ratio = excluded.expense_ratio,
        expense_source = excluded.expense_source,
        updated_at = excluded.updated_at
    `).run(cleanSym, issuer, expenseRatioPct, expenseSource, Date.now());

    return db.prepare('SELECT * FROM etf_meta WHERE symbol = ?').get(cleanSym) || existing;
  } catch (err) {
    if (err && err.name === 'AbortError') return existing;
    return existing;
  }
}

module.exports = {
  ETF_META_TTL_MS,
  formatTwYahooEtfCandidates,
  parseTwseEtfOpenApiMeta,
  fetchAndIngestTwseEtfOpenApiMeta,
  getOrFetchTwEtfMeta,
  resetTwEtfMetaStateForTest,
};
