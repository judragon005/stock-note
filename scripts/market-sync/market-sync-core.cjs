/**
 * Node.js 執行環境專用市場同步共用核心
 * (CommonJS 規範，支援排程腳本無依賴執行)
 */

const fs = require('fs');
const path = require('path');

function formatDateYMD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '--' || str === '' || str === '---') return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * 統一剝除上櫃代碼尾綴 O（如 8299O -> 8299、00679BO -> 00679B）
 * @param {string} symbol
 * @returns {string}
 */
function stripOtcSuffix(symbol) {
  if (symbol === null || symbol === undefined) return '';
  const clean = String(symbol).trim().toUpperCase();
  if (clean.length > 2 && clean.endsWith('O')) {
    const stripped = clean.slice(0, -1);
    if (/^[0-9]{4,6}[A-Z]?$/.test(stripped)) {
      return stripped;
    }
  }
  return clean;
}

function parseTwseT86BulkData(rawData) {
  const result = {};
  if (!rawData || (rawData.stat !== 'OK' && rawData.stat !== 'ok') || !Array.isArray(rawData.data)) {
    return result;
  }

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 12) continue;
    const symbol = String(row[0]).trim();
    const name = String(row[1]).trim();
    const foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
    const trustNetShares = Math.round(parseCleanNumber(row[10]) / 1000);
    const dealerNetShares = Math.round(parseCleanNumber(row[11]) / 1000);
    const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

    result[symbol] = {
      symbol,
      name,
      foreignNetShares,
      trustNetShares,
      dealerNetShares,
      totalNetShares,
    };
  }
  return result;
}

function parseTpexT86BulkData(rawData) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = stripOtcSuffix(row[0]);
      if (!symbol) continue;
      const name = String(row[1]).trim();
      let foreignNetShares = 0;
      let trustNetShares = 0;
      let dealerNetShares = 0;
      let totalNetShares = 0;

      if (row.length >= 24) {
        // 官方標準 24 欄格式
        // 外資及陸資買賣超：row[10]
        foreignNetShares = Math.round(parseCleanNumber(row[10]) / 1000);
        // 投信買賣超：row[13]
        trustNetShares = Math.round(parseCleanNumber(row[13]) / 1000);
        // 自營商買賣超：row[22]
        dealerNetShares = Math.round(parseCleanNumber(row[22]) / 1000);
        // 三大法人合計買賣超：row[23]
        totalNetShares = row[23] !== undefined ? Math.round(parseCleanNumber(row[23]) / 1000) : (foreignNetShares + trustNetShares + dealerNetShares);
      } else {
        // 簡化或舊版相容格式
        foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
        trustNetShares = Math.round(parseCleanNumber(row[7]) / 1000);
        dealerNetShares = Math.round(parseCleanNumber(row[8]) / 1000);
        totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;
      }

      result[symbol] = {
        symbol,
        name,
        foreignNetShares,
        trustNetShares,
        dealerNetShares,
        totalNetShares,
      };
    }
  }
  return result;
}

function parseTwseDailyQuotesBulk(rawData, dateStr) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.tables)) return result;

  for (const table of rawData.tables) {
    if (!Array.isArray(table.data)) continue;
    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const volume = parseCleanNumber(row[2]);
      const transactions = parseCleanNumber(row[3]);
      const open = parseCleanNumber(row[5]);
      const high = parseCleanNumber(row[6]);
      const low = parseCleanNumber(row[7]);
      const close = parseCleanNumber(row[8]);

      if (close > 0) {
        result[symbol] = {
          symbol,
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
          transactions: transactions > 0 ? transactions : undefined,
        };
      }
    }
  }
  return result;
}

/**
 * 判斷是否為台股櫃買 6 碼以 7 開頭之認購／認售權證 (對齊上市 ALLBUT0999，Spec 0184 / Spec 0246 Ticket 04)
 * @param {string} symbol
 * @returns {boolean}
 */
function isTwOtcWarrantSymbol(symbol) {
  return /^7[0-9]{5}$/.test(String(symbol || '').trim().toUpperCase());
}

function parseTpexDailyQuotesBulk(rawData, dateStr) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const rawSymbol = String(row[0]).trim();
      if (rawSymbol.length > 7) continue;

      // 剝除櫃買可能的 'O' 尾綴 (如 3293O -> 3293, 00679BO -> 00679B)
      const symbol = stripOtcSuffix(rawSymbol);
      if (!symbol || symbol.length > 6) continue;

      // Spec 0246 Ticket 04: 與 backfill-tw-history-web 統一濾除 6 碼 7 開頭櫃買權證
      if (isTwOtcWarrantSymbol(symbol)) continue;

      const isSplitSign = row[3] === '+' || row[3] === '-' || row[3] === 'X' || row[3] === ' ';
      const close = parseCleanNumber(row[2]);
      const open = isSplitSign ? parseCleanNumber(row[5]) : parseCleanNumber(row[4]);
      const high = isSplitSign ? parseCleanNumber(row[6]) : parseCleanNumber(row[5]);
      const low = isSplitSign ? parseCleanNumber(row[7]) : parseCleanNumber(row[6]);
      const volume = isSplitSign ? parseCleanNumber(row[8]) : parseCleanNumber(row[7]);
      const transactions = isSplitSign
        ? (row.length >= 11 ? parseCleanNumber(row[10]) : undefined)
        : (row.length >= 10 ? parseCleanNumber(row[9]) : undefined);

      if (close > 0) {
        result[symbol] = {
          symbol,
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
          transactions: transactions && transactions > 0 ? transactions : undefined,
        };
      }
    }
  }
  return result;
}

function computeIncrementalIndicators(candles) {
  if (!candles || candles.length === 0) return [];
  const points = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    
    // MA5
    let ma5 = c.close;
    if (i >= 4) {
      let sum = 0;
      for (let j = i - 4; j <= i; j++) sum += candles[j].close;
      ma5 = sum / 5;
    }

    // MA20
    let ma20 = c.close;
    if (i >= 19) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += candles[j].close;
      ma20 = sum / 20;
    }

    // MA60
    let ma60 = c.close;
    if (i >= 59) {
      let sum = 0;
      for (let j = i - 59; j <= i; j++) sum += candles[j].close;
      ma60 = sum / 60;
    }

    // Darvas 箱體 (過去 20 日最高/最低)
    const windowStart = Math.max(0, i - 19);
    let darvasHigh = c.high;
    let darvasLow = c.low;
    for (let w = windowStart; w <= i; w++) {
      if (candles[w].high > darvasHigh) darvasHigh = candles[w].high;
      if (candles[w].low < darvasLow) darvasLow = candles[w].low;
    }

    points.push({
      date: c.date,
      close: c.close,
      volume: c.volume,
      ma5,
      ma20,
      ma60,
      darvasHigh,
      darvasLow,
      darvasState: c.close >= darvasHigh ? 'UPPER_BREAKOUT' : c.close <= darvasLow ? 'LOWER_BREAKOUT' : 'IN_BOX',
      biasMa20: ma20 > 0 ? ((c.close - ma20) / ma20) * 100 : 0,
    });
  }
  return points;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveJsonAtomic(targetPath, data) {
  const dir = path.dirname(targetPath);
  ensureDirSync(dir);
  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');

  // Windows EPERM / EBUSY 檔案鎖定退避重試與安全覆寫 (Spec 0186 / Ticket 01)
  let renamed = false;
  for (let i = 0; i < 5; i++) {
    try {
      fs.renameSync(tempPath, targetPath);
      renamed = true;
      break;
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EBUSY') {
        const end = Date.now() + 30 * (i + 1);
        while (Date.now() < end) {}
      } else {
        break;
      }
    }
  }

  if (!renamed) {
    try {
      fs.copyFileSync(tempPath, targetPath);
      fs.unlinkSync(tempPath);
    } catch {
      // 最終保底覆寫
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
  }
}


/**
 * 美股標的代碼正規化 (如 BRK.A -> BRK-A, BRK.B -> BRK-B, BF.B -> BF-B)
 * @param {string} symbol
 * @returns {string}
 */
function normalizeUsSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  const clean = symbol.trim().toUpperCase();
  return clean.replace(/\./g, '-');
}
/**
 * 具有指數退避的非同步重試器 (Spec 0184)
 * @param {Function} fn
 * @param {number} [retries=3]
 * @param {number} [delayMs=1500]
 * @returns {Promise<any>}
 */
async function retryFetch(fn, retries = 3, delayMs = 1500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * 雙向代碼別名產生器 (SSOT — Spec 0240 T03):
 * - 台股櫃買: 3293 <-> 3293O
 * - 美股含點號/連字號: BRK.B <-> BRK-B
 */
function buildSymbolAliases(rawSymbol) {
  const sym = decodeURIComponent(String(rawSymbol || '')).trim().toUpperCase();
  if (!sym) return ['', ''];
  if (/^\d{2,}[A-Z0-9]*$/.test(sym)) {
    const alias = sym.endsWith('O') && sym.length >= 4 ? sym.slice(0, -1) : `${sym}O`;
    return [sym, alias];
  }
  if (sym.includes('.')) {
    return [sym, sym.replace(/\./g, '-')];
  }
  if (sym.includes('-')) {
    return [sym, sym.replace(/-/g, '.')];
  }
  return [sym, sym];
}

/**
 * 將美股代碼轉換為 Yahoo Finance URL 格式（如 BRK.B -> BRK-B）(SSOT — Spec 0240 T03)
 */
function normalizeYahooSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase().replace(/\./g, '-');
}

/**
 * 產生美股代碼雙向比對候選清單（支援 BRK.B <-> BRK-B <-> BRK_B）(SSOT — Spec 0240 T03)
 */
function normalizeUsTickerCandidates(symbol) {
  const raw = String(symbol || '').trim().toUpperCase();
  if (!raw) return [];
  const candidates = new Set([raw]);
  candidates.add(raw.replace(/[._]/g, '-'));
  candidates.add(raw.replace(/[-_]/g, '.'));
  return Array.from(candidates);
}

/**
 * Deadlock-Free Lock-Scoped Fetch (Spec 0247 T06)
 * 複合逾時與外部 AbortSignal 的統一安全抓取原語，防止全域同步鎖內 TCP 半開永久死鎖
 * @param {string} url
 * @param {{ fetcher?: Function, timeoutMs?: number, signal?: AbortSignal, [key: string]: any }} [options]
 */
const DEFAULT_LOCK_SCOPED_FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options = {}) {
  const {
    fetcher = globalThis.fetch,
    timeoutMs = DEFAULT_LOCK_SCOPED_FETCH_TIMEOUT_MS,
    signal: externalSignal,
    ...fetchInit
  } = options || {};

  if (typeof fetcher !== 'function') {
    throw new Error('FETCH_UNAVAILABLE');
  }

  if (externalSignal && externalSignal.aborted) {
    const err = new Error('Fetch aborted by external signal');
    err.name = 'AbortError';
    throw err;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  let onExternalAbort = null;

  if (controller) {
    if (externalSignal && typeof externalSignal.addEventListener === 'function') {
      onExternalAbort = () => {
        try {
          controller.abort(externalSignal.reason);
        } catch {
          try {
            controller.abort();
          } catch {}
        }
      };
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    if (typeof timeoutMs === 'number' && timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        try {
          const timeoutErr = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
          timeoutErr.name = 'AbortError';
          controller.abort(timeoutErr);
        } catch {
          try {
            controller.abort();
          } catch {}
        }
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
    }
  }

  try {
    return await fetcher(url, {
      ...fetchInit,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal && onExternalAbort && typeof externalSignal.removeEventListener === 'function') {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

module.exports = {
  DEFAULT_LOCK_SCOPED_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  formatDateYMD,
  parseCleanNumber,
  stripOtcSuffix,
  isTwOtcWarrantSymbol,
  buildSymbolAliases,
  normalizeYahooSymbol,
  normalizeUsTickerCandidates,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  parseTwseDailyQuotesBulk,
  parseTpexDailyQuotesBulk,
  computeIncrementalIndicators,
  ensureDirSync,
  saveJsonAtomic,
  normalizeUsSymbol,
  retryFetch,
};

