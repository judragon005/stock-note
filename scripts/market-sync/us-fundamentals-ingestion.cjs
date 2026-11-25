/**
 * us-fundamentals-ingestion.cjs
 * 美股基本面、13F 機構持股、美股 ETF 指標與近 2 年配息抓取及 SQLite 持久化模組 (Spec 0239 T06)
 * 100% 免費公開來源（Yahoo Finance v10 quoteSummary + v8 Chart events=div），零第三方相依。
 */

const { ensureCorporateActionCalendarTable } = require('./sqlite-db-core.cjs');
const { normalizeYahooSymbol, fetchWithTimeout } = require('./market-sync-core.cjs');

const CRUMB_TTL_MS = 30 * 60 * 1000; // Cookie + Crumb 快取 30 分鐘
const CIRCUIT_BREAKER_MS = 5 * 60 * 1000; // HTTP 429 熔斷冷卻 5 分鐘
const DEFAULT_FUNDAMENTALS_TTL_MS = 24 * 60 * 60 * 1000; // SQLite 基本面快取 24 小時

const QUOTE_SUMMARY_MODULES = [
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
  'majorHoldersBreakdown',
  'fundProfile',
  'price',
].join(',');

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 模組層級 Cookie / Crumb 快取與 429 熔斷器狀態
let crumbCache = {
  cookie: '',
  crumb: '',
  expiresAt: 0,
};
let circuitOpenUntil = 0;

/**
 * 正規化標準美股代碼（去空白、大寫，保留點號如 BRK.B）
 */
function normalizeCanonicalSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

/**
 * 依美東時區 (America/New_York) 格式化 YYYY-MM-DD 交易日期
 */
function formatUsEasternDate(timestampMs = Date.now()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestampMs));
  } catch {
    return new Date(timestampMs).toISOString().slice(0, 10);
  }
}

/**
 * 安全解包 Yahoo Finance 數值欄位（支援 { raw, fmt } 與裸數值，缺失或異常回傳 null）
 */
function extractRawNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'object' && 'raw' in val) {
    const raw = val.raw;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  }
  return null;
}

/**
 * 消除 IEEE-754 浮點誤差之安全四捨五入
 */
function roundTo(num, decimals = 4) {
  return Number(num.toFixed(decimals));
}

/**
 * 檢查 Yahoo quoteSummary 429 熔斷器是否開啟
 */
function isUsQuoteSummaryCircuitOpen(now = Date.now()) {
  return circuitOpenUntil > now;
}

/**
 * 測試專用：重置 Cookie/Crumb 快取與 429 熔斷器狀態
 */
function resetUsFundamentalsStateForTest() {
  crumbCache = { cookie: '', crumb: '', expiresAt: 0 };
  circuitOpenUntil = 0;
}

/**
 * 契約 1：冪等建立 us_fundamentals_daily 資料表與查詢索引
 * @param {import('node:sqlite').DatabaseSync} db
 */
function ensureUsFundamentalsTable(db) {
  if (!db || typeof db.exec !== 'function') {
    throw new Error('ERR_INVALID_DB: 需要有效的 SQLite DatabaseSync 實例');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS us_fundamentals_daily (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      pe REAL,
      forward_pe REAL,
      pb REAL,
      ps_ratio REAL,
      dividend_yield REAL,
      institutional_ratio REAL,
      insider_ratio REAL,
      short_float_ratio REAL,
      public_float_ratio REAL,
      etf_aum_billion REAL,
      etf_expense_ratio REAL,
      etf_nav_price REAL,
      etf_premium_discount_ratio REAL,
      source TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_us_fundamentals_symbol_date
      ON us_fundamentals_daily(symbol, date DESC);
  `);
}

/**
 * 契約 2：純函式解析 Yahoo Finance v10 quoteSummary JSON 為美股基本面 / 13F / ETF 結構
 * 嚴格遵守 Zero-Mock：缺失欄位回傳 null，絕不填假數字。
 */
function parseYahooQuoteSummaryToFundamentals(symbol, rawJson, options = {}) {
  const cleanSymbol = normalizeCanonicalSymbol(symbol);
  if (!cleanSymbol || !rawJson || typeof rawJson !== 'object') return null;

  const result = rawJson?.quoteSummary?.result?.[0];
  if (!result || typeof result !== 'object') return null;

  const summaryDetail = result.summaryDetail || {};
  const defaultKeyStatistics = result.defaultKeyStatistics || {};
  const majorHoldersBreakdown = result.majorHoldersBreakdown || {};
  const fundProfile = result.fundProfile || {};
  const price = result.price || {};

  // 估值倍數
  const pe = extractRawNumber(summaryDetail.trailingPE) ?? extractRawNumber(defaultKeyStatistics.trailingPE);
  const forwardPe = extractRawNumber(summaryDetail.forwardPE) ?? extractRawNumber(defaultKeyStatistics.forwardPE);
  const pb = extractRawNumber(defaultKeyStatistics.priceToBook);
  const psRatio = extractRawNumber(summaryDetail.priceToSalesTrailing12Months);

  // 殖利率（小數轉百分比，如 0.0185 -> 1.85）
  const rawDividendYield =
    extractRawNumber(summaryDetail.dividendYield) ??
    extractRawNumber(summaryDetail.trailingAnnualDividendYield) ??
    extractRawNumber(summaryDetail.yield);
  const dividendYield = rawDividendYield !== null ? roundTo(rawDividendYield * 100, 4) : null;

  // 13F 機構持股、內部人持股、空頭流通比與推算公開流通比
  const rawInst = extractRawNumber(majorHoldersBreakdown.institutionsPercentHeld);
  const rawInsider = extractRawNumber(majorHoldersBreakdown.insidersPercentHeld);
  const rawShortFloat = extractRawNumber(defaultKeyStatistics.shortPercentOfFloat);

  const institutionalRatio = rawInst !== null ? roundTo(rawInst * 100, 4) : null;
  const insiderRatio = rawInsider !== null ? roundTo(rawInsider * 100, 4) : null;
  const shortFloatRatio = rawShortFloat !== null ? roundTo(rawShortFloat * 100, 4) : null;

  const publicFloatRatio =
    institutionalRatio !== null && insiderRatio !== null
      ? Math.max(0, Number((100 - institutionalRatio - insiderRatio).toFixed(2)))
      : null;

  // 美股 ETF 專屬指標
  const rawTotalAssets = extractRawNumber(summaryDetail.totalAssets);
  const etfAumBillion = rawTotalAssets !== null ? roundTo(rawTotalAssets / 1e9, 4) : null;

  const rawExpenseRatio =
    extractRawNumber(fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio) ??
    extractRawNumber(defaultKeyStatistics.annualReportExpenseRatio);
  const etfExpenseRatio = rawExpenseRatio !== null ? roundTo(rawExpenseRatio * 100, 4) : null;

  const etfNavPrice = extractRawNumber(summaryDetail.navPrice);
  const regularMarketPrice = extractRawNumber(price.regularMarketPrice);

  const etfPremiumDiscountRatio =
    regularMarketPrice !== null &&
    regularMarketPrice > 0 &&
    etfNavPrice !== null &&
    etfNavPrice > 0
      ? roundTo(((regularMarketPrice - etfNavPrice) / etfNavPrice) * 100, 4)
      : null;

  const dateStr =
    typeof options.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.date)
      ? options.date
      : formatUsEasternDate(options.now ?? Date.now());

  return {
    symbol: cleanSymbol,
    date: dateStr,
    pe,
    forwardPe,
    pb,
    psRatio,
    dividendYield,
    institutionalRatio,
    insiderRatio,
    shortFloatRatio,
    publicFloatRatio,
    etfAumBillion,
    etfExpenseRatio,
    etfNavPrice,
    etfPremiumDiscountRatio,
    source: 'YAHOO_QUOTE_SUMMARY',
  };
}

/**
 * 自 HTTP Response 標頭提取可傳送之 Cookie 字串（支援 getSetCookie() 與合併 set-cookie 字串）
 */
function extractCookieHeaderFromResponse(res) {
  let rawCookies = [];
  if (res?.headers && typeof res.headers.getSetCookie === 'function') {
    const list = res.headers.getSetCookie();
    if (Array.isArray(list) && list.length > 0) {
      rawCookies = list;
    }
  }

  if (rawCookies.length === 0) {
    const single =
      typeof res?.headers?.get === 'function'
        ? res.headers.get('set-cookie')
        : res?.headers?.['set-cookie'];
    if (typeof single === 'string' && single.trim()) {
      // 僅在下一組 key=value 前切分，避免誤切 Expires=Wed, 21 Oct ... 中的逗號
      rawCookies = single.split(/,(?=\s*[^;,=\s]+=)/);
    }
  }

  return rawCookies
    .map((entry) => String(entry || '').split(';')[0].trim())
    .filter((pair) => pair.includes('='))
    .join('; ');
}

/**
 * 取得或刷新 Yahoo Finance Cookie + Crumb（含 30 分鐘快取與 429 熔斷偵測）
 */
async function getOrRefreshYahooCrumb(fetchImpl, now, forceRefresh = false, reqOpts = {}) {
  if (
    !forceRefresh &&
    crumbCache.cookie &&
    crumbCache.crumb &&
    crumbCache.expiresAt > now
  ) {
    return { cookie: crumbCache.cookie, crumb: crumbCache.crumb };
  }

  // 步驟 1：訪問 fc.yahoo.com 取得有效 Cookie（該端點常回 404 但附帶 Set-Cookie）
  const cookieRes = await fetchWithTimeout('https://fc.yahoo.com', {
    fetcher: fetchImpl,
    signal: reqOpts.signal,
    timeoutMs: reqOpts.timeoutMs ?? 15000,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
  });

  if (cookieRes && cookieRes.status === 429) {
    circuitOpenUntil = now + CIRCUIT_BREAKER_MS;
    return null;
  }

  const cookie = extractCookieHeaderFromResponse(cookieRes);
  if (!cookie) {
    return null;
  }

  // 步驟 2：攜帶 Cookie 請求 getcrumb
  const crumbRes = await fetchWithTimeout('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    fetcher: fetchImpl,
    signal: reqOpts.signal,
    timeoutMs: reqOpts.timeoutMs ?? 15000,
    headers: {
      Cookie: cookie,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/plain,*/*',
    },
  });

  if (!crumbRes) return null;
  if (crumbRes.status === 429) {
    circuitOpenUntil = now + CIRCUIT_BREAKER_MS;
    return null;
  }
  if (!crumbRes.ok) {
    return null;
  }

  const crumb = String((await crumbRes.text()) || '').trim();
  if (!crumb || crumb.startsWith('<')) {
    return null;
  }

  crumbCache = {
    cookie,
    crumb,
    expiresAt: now + CRUMB_TTL_MS,
  };
  return { cookie, crumb };
}

/**
 * 契約 3：攜帶伺服器端 Cookie + Crumb 抓取 Yahoo Finance v10 quoteSummary
 * - Cookie/Crumb 快取 30 分鐘
 * - 點號代碼正規化（如 BRK.B -> BRK-B）
 * - 遇 HTTP 401 自動刷新 Crumb 重試 1 次
 * - 遇 HTTP 429 啟動 5 分鐘熔斷器並安全降級回傳 null
 */
async function fetchYahooQuoteSummaryWithCrumb(symbol, options = {}) {
  const yahooSymbol = normalizeYahooSymbol(symbol);
  if (!yahooSymbol) return null;

  const fetchImpl = options.fetchImpl || options.fetchFn || globalThis.fetch;
  if (typeof fetchImpl !== 'function') return null;

  const now = options.now ?? Date.now();
  if (isUsQuoteSummaryCircuitOpen(now)) {
    return null;
  }

  const reqOpts = { signal: options.signal, timeoutMs: options.timeoutMs ?? 15000 };
  const executeSummaryRequest = async (auth) => {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}` +
      `?modules=${encodeURIComponent(QUOTE_SUMMARY_MODULES)}&crumb=${encodeURIComponent(auth.crumb)}`;

    return fetchWithTimeout(url, {
      fetcher: fetchImpl,
      signal: reqOpts.signal,
      timeoutMs: reqOpts.timeoutMs,
      headers: {
        Cookie: auth.cookie,
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });
  };

  try {
    let auth = await getOrRefreshYahooCrumb(fetchImpl, now, Boolean(options.forceRefreshCrumb), reqOpts);
    if (!auth) return null;

    let res = await executeSummaryRequest(auth);
    if (!res) return null;

    if (res.status === 429) {
      circuitOpenUntil = now + CIRCUIT_BREAKER_MS;
      return null;
    }

    // 遇 HTTP 401：清空快取刷新 Crumb 並重試 1 次
    if (res.status === 401) {
      crumbCache = { cookie: '', crumb: '', expiresAt: 0 };
      auth = await getOrRefreshYahooCrumb(fetchImpl, now, true, reqOpts);
      if (!auth) return null;

      res = await executeSummaryRequest(auth);
      if (!res) return null;
      if (res.status === 429) {
        circuitOpenUntil = now + CIRCUIT_BREAKER_MS;
        return null;
      }
    }

    if (!res.ok) {
      console.warn(`[UsFundamentals] Yahoo quoteSummary 回應異常 (${yahooSymbol}): HTTP ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[UsFundamentals] Yahoo quoteSummary 抓取失敗 (${yahooSymbol}):`, err?.message || err);
    return null;
  }
}

/**
 * 契約 4：透過 Yahoo v8 Chart (range=2y&interval=1d&events=div) 抓取美股近 2 年真實配息並入庫
 */
async function fetchAndIngestUsDividends(db, symbol, options = {}) {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('ERR_INVALID_DB: 需要有效的 SQLite DatabaseSync 實例');
  }

  const cleanSymbol = normalizeCanonicalSymbol(symbol);
  const yahooSymbol = normalizeYahooSymbol(symbol);
  if (!cleanSymbol || !yahooSymbol) {
    return { success: false, symbol: cleanSymbol, count: 0, records: [], error: 'INVALID_SYMBOL' };
  }

  const fetchImpl = options.fetchImpl || options.fetchFn || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { success: false, symbol: cleanSymbol, count: 0, records: [], error: 'FETCH_UNAVAILABLE' };
  }

  const now = options.now ?? Date.now();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=2y&interval=1d&events=div`;

  try {
    const res = await fetchWithTimeout(url, {
      fetcher: fetchImpl,
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? 15000,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!res || !res.ok) {
      const status = res?.status ?? 'UNKNOWN';
      return { success: false, symbol: cleanSymbol, count: 0, records: [], error: `HTTP_${status}` };
    }

    const json = await res.json();
    const dividendsObj = json?.chart?.result?.[0]?.events?.dividends;
    if (!dividendsObj || typeof dividendsObj !== 'object') {
      return { success: true, symbol: cleanSymbol, count: 0, records: [] };
    }

    const records = [];
    for (const item of Object.values(dividendsObj)) {
      if (!item || typeof item !== 'object') continue;
      const amount = Number(item.amount);
      const tsSec = Number(item.date);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (!Number.isFinite(tsSec) || tsSec <= 0) continue;

      const exDate = formatUsEasternDate(tsSec * 1000);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(exDate)) continue;

      records.push({
        symbol: cleanSymbol,
        market: 'US',
        actionType: 'DIVIDEND',
        exDate,
        cashDividendPerShare: roundTo(amount, 6),
      });
    }

    if (records.length === 0) {
      return { success: true, symbol: cleanSymbol, count: 0, records: [] };
    }

    ensureCorporateActionCalendarTable(db);
    const stmt = db.prepare(`
      INSERT INTO corporate_action_calendar (
        symbol, market, action_type, ex_date, payment_date,
        cash_dividend_per_share, stock_dividend_ratio, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol, action_type, ex_date) DO UPDATE SET
        market = excluded.market,
        cash_dividend_per_share = excluded.cash_dividend_per_share,
        updated_at = excluded.updated_at
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const r of records) {
        stmt.run(r.symbol, r.market, r.actionType, r.exDate, null, r.cashDividendPerShare, 0, now);
      }
      db.exec('COMMIT;');
    } catch (dbErr) {
      db.exec('ROLLBACK;');
      throw dbErr;
    }

    return {
      success: true,
      symbol: cleanSymbol,
      count: records.length,
      records,
    };
  } catch (err) {
    console.warn(`[UsFundamentals] 美股配息抓取失敗 (${cleanSymbol}):`, err?.message || err);
    return {
      success: false,
      symbol: cleanSymbol,
      count: 0,
      records: [],
      error: err?.message || 'FETCH_ERROR',
    };
  }
}

/**
 * 將 SQLite us_fundamentals_daily 列轉換為對外標準 camelCase 物件
 */
function mapDbRowToFundamentals(row, extras = {}) {
  if (!row) return null;
  return {
    symbol: row.symbol,
    date: row.date,
    pe: row.pe ?? null,
    forwardPe: row.forward_pe ?? null,
    pb: row.pb ?? null,
    psRatio: row.ps_ratio ?? null,
    dividendYield: row.dividend_yield ?? null,
    institutionalRatio: row.institutional_ratio ?? null,
    insiderRatio: row.insider_ratio ?? null,
    shortFloatRatio: row.short_float_ratio ?? null,
    publicFloatRatio: row.public_float_ratio ?? null,
    etfAumBillion: row.etf_aum_billion ?? null,
    etfExpenseRatio: row.etf_expense_ratio ?? null,
    etfNavPrice: row.etf_nav_price ?? null,
    etfPremiumDiscountRatio: row.etf_premium_discount_ratio ?? null,
    source: row.source ?? null,
    updatedAt: row.updated_at,
    ...extras,
  };
}

/**
 * 寫入或更新單筆美股基本面至 us_fundamentals_daily
 */
function upsertUsFundamentalsRow(db, record, updatedAt) {
  const stmt = db.prepare(`
    INSERT INTO us_fundamentals_daily (
      symbol, date, pe, forward_pe, pb, ps_ratio, dividend_yield,
      institutional_ratio, insider_ratio, short_float_ratio, public_float_ratio,
      etf_aum_billion, etf_expense_ratio, etf_nav_price, etf_premium_discount_ratio,
      source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      pe = excluded.pe,
      forward_pe = excluded.forward_pe,
      pb = excluded.pb,
      ps_ratio = excluded.ps_ratio,
      dividend_yield = excluded.dividend_yield,
      institutional_ratio = excluded.institutional_ratio,
      insider_ratio = excluded.insider_ratio,
      short_float_ratio = excluded.short_float_ratio,
      public_float_ratio = excluded.public_float_ratio,
      etf_aum_billion = excluded.etf_aum_billion,
      etf_expense_ratio = excluded.etf_expense_ratio,
      etf_nav_price = excluded.etf_nav_price,
      etf_premium_discount_ratio = excluded.etf_premium_discount_ratio,
      source = excluded.source,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    record.symbol,
    record.date,
    record.pe,
    record.forwardPe,
    record.pb,
    record.psRatio,
    record.dividendYield,
    record.institutionalRatio,
    record.insiderRatio,
    record.shortFloatRatio,
    record.publicFloatRatio,
    record.etfAumBillion,
    record.etfExpenseRatio,
    record.etfNavPrice,
    record.etfPremiumDiscountRatio,
    record.source,
    updatedAt
  );
}

/**
 * 契約 5：優先讀取 us_fundamentals_daily（24 小時 TTL 命中即回傳，0 外部請求）；
 * 過期或不存在時呼叫 fetchYahooQuoteSummaryWithCrumb 入庫，並按需補齊美股近 2 年配息。
 */
async function getOrFetchUsFundamentals(db, symbol, options = {}) {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('ERR_INVALID_DB: 需要有效的 SQLite DatabaseSync 實例');
  }

  const cleanSymbol = normalizeCanonicalSymbol(symbol);
  if (!cleanSymbol) return null;

  ensureUsFundamentalsTable(db);

  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_FUNDAMENTALS_TTL_MS;

  const existing = db
    .prepare(
      `SELECT * FROM us_fundamentals_daily
       WHERE symbol = ?
       ORDER BY updated_at DESC, date DESC
       LIMIT 1`
    )
    .get(cleanSymbol);

  // 24 小時內快取命中：0 外部請求直接回傳
  if (
    existing &&
    !options.forceRefresh &&
    now - Number(existing.updated_at) < ttlMs
  ) {
    return mapDbRowToFundamentals(existing, { fromCache: true, stale: false });
  }

  // 若呼叫端已觸發 AbortSignal，提早安全中止避免無效外部 I/O (Spec 0240 Patch 2)
  if (options.signal?.aborted) {
    return existing ? mapDbRowToFundamentals(existing, { fromCache: true, stale: true }) : null;
  }

  // Spec 0247 T08: 統一 fetchImpl / fetchFn 鍵名並透傳 signal 與 timeoutMs，確保 AbortController 真正穿透底層請求
  const baseFetch = options.fetchImpl || options.fetchFn || globalThis.fetch;
  const scopedOptions = {
    ...options,
    fetchImpl: baseFetch,
    fetchFn: baseFetch,
  };

  // 過期或不存在：向 Yahoo Finance v10 quoteSummary 抓取
  const rawJson = await fetchYahooQuoteSummaryWithCrumb(cleanSymbol, scopedOptions);
  const parsed = rawJson
    ? parseYahooQuoteSummaryToFundamentals(cleanSymbol, rawJson, { now, date: options.date })
    : null;

  if (!parsed) {
    // 抓取失敗或 429 熔斷：若有舊快取則降級回傳舊資料並標記 stale，否則回傳 null
    if (existing) {
      return mapDbRowToFundamentals(existing, { fromCache: true, stale: true });
    }
    return null;
  }

  upsertUsFundamentalsRow(db, parsed, now);

  // 按需補齊近 2 年美股歷史配息（不阻斷基本面主回傳）
  if (options.includeDividends !== false && !options.signal?.aborted) {
    try {
      await fetchAndIngestUsDividends(db, cleanSymbol, scopedOptions);
    } catch (divErr) {
      console.warn(`[UsFundamentals] 按需配息補齊警示 (${cleanSymbol}):`, divErr?.message || divErr);
    }
  }

  return {
    ...parsed,
    updatedAt: now,
    fromCache: false,
    stale: false,
  };
}

module.exports = {
  CRUMB_TTL_MS,
  CIRCUIT_BREAKER_MS,
  DEFAULT_FUNDAMENTALS_TTL_MS,
  normalizeYahooSymbol,
  ensureUsFundamentalsTable,
  parseYahooQuoteSummaryToFundamentals,
  fetchYahooQuoteSummaryWithCrumb,
  fetchAndIngestUsDividends,
  getOrFetchUsFundamentals,
  isUsQuoteSummaryCircuitOpen,
  resetUsFundamentalsStateForTest,
};
