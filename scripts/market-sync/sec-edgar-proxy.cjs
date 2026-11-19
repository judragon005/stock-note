/**
 * sec-edgar-proxy.cjs
 * SEC EDGAR 伺服器端合規代理與全美股動態 CIK 解析引擎 (Spec 0239 T07)
 *
 * 合規要求：
 * - 伺服器端注入標準 User-Agent 與 Accept 標頭（徹底避免瀏覽器 Forbidden Header 遭封鎖）
 * - 嚴格速率限制 <= 10 req/s（相鄰請求至少間隔 110ms，支援並發排隊序列化）
 * - 下載並快取 SEC 官方全美股 company_tickers.json（記憶體 + 本地檔案快取，TTL 7 天）
 */

const fs = require('fs');
const path = require('path');

const SEC_EDGAR_USER_AGENT = 'StockTrackerApp/1.0 (local-analytics@stocktracker.local)';
const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_COMPANY_FACTS_BASE_URL = 'https://data.sec.gov/api/xbrl/companyfacts';
const DEFAULT_TICKERS_CACHE_PATH = path.resolve(
  __dirname,
  '../../.scratch/market-cache/sec_company_tickers.json'
);
const TICKERS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天快取 TTL
const MIN_RATE_LIMIT_INTERVAL_MS = 110; // <= 10 req/s（至少 110ms 間隔）

let memoryTickersCache = null; // { cachePath: string, fetchedAt: number, map: Map<string, string> }
const inFlightTickersLoads = new Map(); // cachePath -> Promise<Map<string, string>>
let rateLimitChain = Promise.resolve();
let lastSecRequestAt = 0;

/**
 * 取得符合 SEC EDGAR 官方合規政策之伺服器端請求標頭
 */
function getServerSecHeaders() {
  return {
    'User-Agent': SEC_EDGAR_USER_AGENT,
    Accept: 'application/json',
  };
}

/**
 * 將 CIK 正規化為 10 碼零填充字串
 */
function normalizeCik(cik) {
  if (cik === null || cik === undefined) return null;
  const digits = String(cik).replace(/^CIK/i, '').trim();
  if (!/^\d+$/.test(digits)) return null;
  return digits.padStart(10, '0');
}

/**
 * 產生美股代碼雙向比對候選清單（支援 BRK.B <-> BRK-B <-> BRK_B）
 */
function normalizeUsTickerCandidates(symbol) {
  const raw = String(symbol || '').trim().toUpperCase();
  if (!raw) return [];

  const candidates = new Set([raw]);
  const dashForm = raw.replace(/[._]/g, '-');
  const dotForm = raw.replace(/[-_]/g, '.');
  candidates.add(dashForm);
  candidates.add(dotForm);

  return Array.from(candidates);
}

/**
 * 預設非同步延遲函式
 */
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 透過串列佇列執行 SEC 速率限制，確保對 SEC 網域相鄰請求間隔 >= minIntervalMs
 */
function scheduleSecRequest(taskFn, options = {}) {
  const minIntervalMs =
    typeof options.minIntervalMs === 'number' ? Math.max(0, options.minIntervalMs) : MIN_RATE_LIMIT_INTERVAL_MS;
  const nowFn = typeof options.nowFn === 'function' ? options.nowFn : Date.now;
  const sleepFn = typeof options.sleepFn === 'function' ? options.sleepFn : defaultSleep;

  const run = async () => {
    if (minIntervalMs > 0 && lastSecRequestAt > 0) {
      const elapsed = nowFn() - lastSecRequestAt;
      const waitMs = minIntervalMs - elapsed;
      if (waitMs > 0) {
        await sleepFn(waitMs);
      }
    }
    lastSecRequestAt = nowFn();
    return taskFn();
  };

  const next = rateLimitChain.then(run, run);
  // 確保前一個任務失敗不會阻斷後續佇列執行
  rateLimitChain = next.catch(() => {});
  return next;
}

/**
 * 解析 SEC company_tickers.json 原始結構為大寫代碼 -> 10 碼 CIK 對照表
 */
function parseSecCompanyTickersPayload(payload) {
  const map = new Map();
  if (!payload || typeof payload !== 'object') return map;

  // 若為本地快取格式 { fetchedAt, tickers: { AAPL: '0000320193' } }
  if (payload.tickers && typeof payload.tickers === 'object' && !Array.isArray(payload.tickers)) {
    for (const [ticker, cik] of Object.entries(payload.tickers)) {
      const normalizedCik = normalizeCik(cik);
      const upperTicker = String(ticker || '').trim().toUpperCase();
      if (upperTicker && normalizedCik) {
        map.set(upperTicker, normalizedCik);
      }
    }
    return map;
  }

  // SEC 官方格式：{ "0": { cik_str, ticker, title }, ... } 或陣列
  const entries = Array.isArray(payload) ? payload : Object.values(payload);
  for (const item of entries) {
    if (!item || typeof item !== 'object') continue;
    const upperTicker = String(item.ticker || '').trim().toUpperCase();
    const normalizedCik = normalizeCik(item.cik_str ?? item.cik);
    if (upperTicker && normalizedCik) {
      map.set(upperTicker, normalizedCik);
    }
  }
  return map;
}

/**
 * 讀取本地快取檔（若有效且未過 TTL 則回傳）
 */
function readTickersFileCache(cachePath, now, ttlMs) {
  try {
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    if (now - parsed.fetchedAt >= ttlMs) return null;
    const map = parseSecCompanyTickersPayload(parsed);
    if (map.size === 0) return null;
    return { cachePath, fetchedAt: parsed.fetchedAt, map };
  } catch {
    return null;
  }
}

/**
 * 將全美股 Ticker -> CIK 對照表持久化至本地快取檔
 */
function writeTickersFileCache(cachePath, fetchedAt, map) {
  try {
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = JSON.stringify({
      fetchedAt,
      tickers: Object.fromEntries(map.entries()),
    });
    const tmpPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, cachePath);
  } catch {
    // 檔案系統無權限時僅保留記憶體快取，不阻斷查詢回傳
  }
}

/**
 * 載入全美股 Ticker -> 10 碼 CIK 對照表（記憶體快取 -> 本地檔案快取 -> SEC 官方遠端下載）
 */
async function loadSecTickerCikMap(options = {}) {
  const cachePath = options.cachePath || DEFAULT_TICKERS_CACHE_PATH;
  const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : TICKERS_CACHE_TTL_MS;
  const nowFn = typeof options.nowFn === 'function' ? options.nowFn : Date.now;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const forceRefresh = Boolean(options.forceRefresh);
  const now = nowFn();

  // 1. 記憶體快取命中
  if (
    !forceRefresh &&
    memoryTickersCache &&
    memoryTickersCache.cachePath === cachePath &&
    now - memoryTickersCache.fetchedAt < ttlMs
  ) {
    return memoryTickersCache.map;
  }

  // 2. 本地檔案快取命中
  if (!forceRefresh) {
    const fileCached = readTickersFileCache(cachePath, now, ttlMs);
    if (fileCached) {
      memoryTickersCache = fileCached;
      return fileCached.map;
    }
  }

  // 3. 遠端下載 SEC 官方全美股對照表（並發單飛去重，避免同時重複請求）
  if (!forceRefresh && inFlightTickersLoads.has(cachePath)) {
    return inFlightTickersLoads.get(cachePath);
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('[SEC EDGAR Proxy] 缺少可用的 fetch 實作');
  }

  const downloadPromise = (async () => {
    const response = await scheduleSecRequest(
      () =>
        fetchImpl(SEC_TICKERS_URL, {
          headers: getServerSecHeaders(),
        }),
      options
    );

    if (!response || !response.ok) {
      const status = response ? response.status : 'NETWORK_ERROR';
      const err = new Error(`[SEC EDGAR Proxy] 下載 company_tickers.json 失敗，HTTP 狀態碼: ${status}`);
      err.statusCode = typeof status === 'number' ? status : 502;
      throw err;
    }

    const payload = await response.json();
    const map = parseSecCompanyTickersPayload(payload);
    if (map.size === 0) {
      const err = new Error('[SEC EDGAR Proxy] company_tickers.json 回傳內容為空或格式異常');
      err.statusCode = 502;
      throw err;
    }

    const fetchedAt = nowFn();
    memoryTickersCache = { cachePath, fetchedAt, map };
    writeTickersFileCache(cachePath, fetchedAt, map);

    return map;
  })();

  inFlightTickersLoads.set(cachePath, downloadPromise);
  try {
    return await downloadPromise;
  } finally {
    inFlightTickersLoads.delete(cachePath);
  }
}

/**
 * 動態解析任意美股代碼之 10 碼零填充 CIK（支援 BRK.B <-> BRK-B 正規化）
 */
async function resolveUsCikDynamic(symbol, options = {}) {
  const candidates = normalizeUsTickerCandidates(symbol);
  if (candidates.length === 0) return null;

  const map = await loadSecTickerCikMap(options);
  for (const candidate of candidates) {
    if (map.has(candidate)) {
      return map.get(candidate);
    }
  }
  return null;
}

/**
 * 伺服器端代理抓取 SEC EDGAR CompanyFacts JSON
 */
async function fetchSecCompanyFactsServer(symbol, options = {}) {
  const cleanSymbol = String(symbol || '').trim().toUpperCase();
  if (!cleanSymbol) {
    const err = new Error('[SEC EDGAR Proxy] 美股代碼不得為空');
    err.statusCode = 400;
    throw err;
  }

  const cik = await resolveUsCikDynamic(cleanSymbol, options);
  if (!cik) {
    const err = new Error(`[SEC EDGAR Proxy] 找不到美股標的 ${cleanSymbol} 的對應 CIK 代碼`);
    err.code = 'SEC_CIK_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('[SEC EDGAR Proxy] 缺少可用的 fetch 實作');
  }

  const url = `${SEC_COMPANY_FACTS_BASE_URL}/CIK${cik}.json`;
  const response = await scheduleSecRequest(
    () =>
      fetchImpl(url, {
        headers: getServerSecHeaders(),
      }),
    options
  );

  if (!response || !response.ok) {
    const status = response ? response.status : 'NETWORK_ERROR';
    const err = new Error(`[SEC EDGAR Proxy] 請求 ${cleanSymbol} (CIK${cik}) 失敗，HTTP 狀態碼: ${status}`);
    err.statusCode = typeof status === 'number' ? status : 502;
    throw err;
  }

  return response.json();
}

/**
 * 重置記憶體快取與速率限制狀態（主要供單元測試與熱重載使用）
 */
function resetSecProxyState() {
  memoryTickersCache = null;
  inFlightTickersLoads.clear();
  rateLimitChain = Promise.resolve();
  lastSecRequestAt = 0;
}

module.exports = {
  SEC_EDGAR_USER_AGENT,
  SEC_TICKERS_URL,
  SEC_COMPANY_FACTS_BASE_URL,
  DEFAULT_TICKERS_CACHE_PATH,
  TICKERS_CACHE_TTL_MS,
  MIN_RATE_LIMIT_INTERVAL_MS,
  getServerSecHeaders,
  normalizeCik,
  normalizeUsTickerCandidates,
  loadSecTickerCikMap,
  resolveUsCikDynamic,
  fetchSecCompanyFactsServer,
  resetSecProxyState,
};
