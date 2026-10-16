/**
 * backfill-tw-history-web.cjs
 * 台股官方 TWSE/TPEx 日期驅動歷史回補模組 (Spec 0168 / Ticket 07)
 * 
 * 核心特色：
 * 1. 100% 依賴 TWSE/TPEx 官方每日全市場日報端點，零外部 CSV 檔案依賴。
 * 2. 支援指定天數（預設 250 交易日），自動排除週末與休市日。
 * 3. 完整擷取開高低收、真實成交筆數 (transactions) 與三大法人籌碼。
 * 4. 櫃買 OTC 標的 O 尾綴全量標準化剝除 (如 00411AO -> 00411A, 3293O -> 3293)。
 * 5. 遵循防爬蟲禮儀，請求間隔預設 3,000ms。
 */

const https = require('https');
const http = require('http');
const path = require('path');
const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const {
  parseCleanNumber,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  retryFetch,
} = require('./market-sync-core.cjs');
const { saveTwT86ToSqlite } = require('./ingest-tw-t86.cjs');
const {
  isTwTradingDay,
  getPreviousTradingDay,
  normalizeDateStr,
  getHolidayReason,
} = require('./trading-calendar-engine.cjs');

/**
 * 簡易非同步延遲
 */
function sleep(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 日期候選迭代器：往前取得 N 個法定實質交易日候選 (Spec 0184 / Ticket 01)
 * @param {number} [daysCount=250]
 * @param {string} [endDateStr] - YYYY-MM-DD
 * @param {Date} [customNow] - 外部注入時間 (測試用)
 * @returns {string[]}
 */
function generateTradeDateCandidates(daysCount = 250, endDateStr, customNow) {
  const result = [];
  let cursorStr = '';

  if (endDateStr) {
    cursorStr = normalizeDateStr(endDateStr);
  } else {
    const now = customNow || new Date();
    // 鎖定台北時間 (UTC+8) 以確保跨時區 (如 GitHub Actions Runner UTC) 判定一致
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const twTime = new Date(utcMs + 8 * 3600000);
    const twHour = twTime.getHours();
    const twMin = twTime.getMinutes();
    const totalMinutes = twHour * 60 + twMin;

    const y = twTime.getFullYear();
    const m = String(twTime.getMonth() + 1).padStart(2, '0');
    const d = String(twTime.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // 若今日為法定交易日且當前時間已過盤後發布門檻 (15:30)，則起始日為今日；否則退至前一交易日
    if (isTwTradingDay(todayStr) && totalMinutes >= 15 * 60 + 30) {
      cursorStr = todayStr;
    } else {
      cursorStr = getPreviousTradingDay(todayStr);
    }
  }


  // 往前回溯收集足額法定實質交易日
  const [y, m, d] = cursorStr.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));

  while (result.length < daysCount) {
    const dStr = cursor.toISOString().slice(0, 10);
    if (isTwTradingDay(dStr)) {
      result.push(dStr);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return result;
}


/**
 * 西元年轉民國年字串 (YYYY-MM-DD -> YYY/MM/DD)
 * @param {string} dateStr
 * @returns {string}
 */
function formatRocDate(dateStr) {
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
  const rocYear = parseInt(parts[0], 10) - 1911;
  return `${rocYear}/${parts[1]}/${parts[2]}`;
}

/**
 * 台股代碼正規化：移除櫃買 O 尾綴
 * @param {string} symbol
 * @returns {string}
 */
function normalizeTwSymbol(symbol) {
  if (!symbol) return '';
  const clean = String(symbol).trim().toUpperCase();
  if (clean.length > 2 && clean.endsWith('O')) {
    // 判斷移除 O 後是否符合台股代碼特徵 (4-6 碼數字加字母)
    const stripped = clean.slice(0, -1);
    if (/^[0-9]{4,6}[A-Z]?$/.test(stripped)) {
      return stripped;
    }
  }
  return clean;
}

/**
 * 預設官方 JSON 請求 (Spec 0187 / Ticket 01: 原生 fetch + AbortSignal.timeout 全生命週期超時)
 */
async function defaultFetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 20000;
  const signal = options.signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      ...options.headers,
    },
    signal,
  });

  if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
    throw new Error(`HTTP 重定向 (${response.status}) 至: ${response.headers.get('location')}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP 異常狀態碼: ${response.status}`);
  }

  const raw = await response.text();
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON 解析失敗 (${response.status}): ${err.message}`);
  }
}


/**
 * 解析 TWSE MI_INDEX 收盤行情總表 (含真實 transactions 成交筆數)
 * @param {object} rawData
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, object>}
 */
function parseTwseDailyQuotesWithTransactions(rawData, dateStr) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.tables)) return result;

  for (const table of rawData.tables) {
    if (!Array.isArray(table.data)) continue;
    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = normalizeTwSymbol(row[0]);
      if (!symbol || symbol.length > 6) continue;

      const volume = parseCleanNumber(row[2]);
      const transactions = parseCleanNumber(row[3]); // 官方真實成交筆數
      const turnover = parseCleanNumber(row[4]);
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
          adj_close: close,
          volume,
          turnover: turnover > 0 ? turnover : 0,
          transactions: transactions > 0 ? transactions : null,
        };
      }
    }
  }
  return result;
}

/**
 * 解析 TPEx 1430 上櫃收盤行情總表 (含真實 transactions 與自動移除 O 尾綴)
 * @param {object} rawData
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, object>}
 */
function parseTpexDailyQuotesWithTransactions(rawData, dateStr) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    // 動態判斷欄位索引 (防禦 TPEx 格式微調)
    const fields = Array.isArray(table?.fields) ? table.fields : [];
    let transIdx = fields.findIndex((f) => String(f).includes('筆數'));
    let volIdx = fields.findIndex((f) => String(f).includes('股數'));
    let turnoverIdx = fields.findIndex((f) => String(f).includes('金額'));

    // 若無表頭則使用官方 1430 典型位置
    if (transIdx === -1) transIdx = 7;
    if (volIdx === -1) volIdx = 8;
    if (turnoverIdx === -1) turnoverIdx = 9;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const rawSymbol = String(row[0]).trim();
      const symbol = normalizeTwSymbol(rawSymbol);
      if (!symbol || symbol.length > 6) continue;

      // Spec 0184 / Ticket 02: 排除 6 碼以 7 開頭之櫃買認購/認售權證，對齊上市 ALLBUT0999
      if (/^7[0-9]{5}$/.test(symbol)) continue;

      const close = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[4]);
      const high = parseCleanNumber(row[5]);
      const low = parseCleanNumber(row[6]);
      const transactions = parseCleanNumber(row[transIdx]);
      const volume = parseCleanNumber(row[volIdx] || row[7]);
      const turnover = parseCleanNumber(row[turnoverIdx] || row[8]);

      if (close > 0) {
        result[symbol] = {
          symbol,
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          adj_close: close,
          volume,
          turnover: turnover > 0 ? turnover : 0,
          transactions: transactions > 0 ? transactions : null,
        };
      }
    }
  }
  return result;
}

/**
 * 批次事務寫入收盤日 K 至 SQLite (包含 transactions)
 * @param {Record<string, object>} quotesMap
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTwDailyQuotesBatch(quotesMap, customDbPath) {
  if (!quotesMap || typeof quotesMap !== 'object') {
    return { savedCount: 0 };
  }

  const entries = Object.values(quotesMap);
  if (entries.length === 0) {
    return { savedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      adj_close = excluded.adj_close,
      volume = excluded.volume,
      turnover = excluded.turnover,
      transactions = COALESCE(excluded.transactions, daily_candles.transactions)
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of entries) {
      if (!item || !item.symbol || !item.date || !item.close) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(item.date).trim(),
        Number(item.open) || Number(item.close),
        Number(item.high) || Number(item.close),
        Number(item.low) || Number(item.close),
        Number(item.close),
        Number(item.adj_close || item.close),
        Number(item.volume) || 0,
        Number(item.turnover) || 0,
        item.transactions !== undefined && item.transactions !== null ? Number(item.transactions) : null
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

// Prepared Statement 快取登錄表 (以 db 實例為 key，隔離且無記憶體洩漏)
const verificationStmtsCache = new WeakMap();

function getVerificationStmts(db) {
  let stmts = verificationStmtsCache.get(db);
  if (!stmts) {
    stmts = {
      stockStmt: db.prepare(`
        SELECT 
          count(*) AS totalCount,
          count(CASE WHEN symbol GLOB '[1-9][0-9][0-9][0-9]' THEN 1 END) AS stockCount,
          count(CASE WHEN symbol GLOB '00*' THEN 1 END) AS etfCount
        FROM daily_candles 
        WHERE date = ? AND (symbol GLOB '[1-9][0-9][0-9][0-9]' OR symbol GLOB '00*')
      `),
      chipStmt: db.prepare("SELECT count(*) AS n FROM tw_institutional_chips WHERE date = ?"),
    };
    verificationStmtsCache.set(db, stmts);
  }
  return stmts;
}

/**
 * 單日官方資料抓取與入庫
 * @param {string} dateStr - YYYY-MM-DD
 * @param {object} [options]
 * @returns {Promise<{ date: string, isTradingDay: boolean, quotesCount: number, chipsCount: number, stockCount?: number, etfCount?: number, cached?: boolean, hasError?: boolean, errorReason?: string, twseQuotesCount?: number, tpexQuotesCount?: number }>}
 */
async function fetchAndIngestTwDailyData(dateStr, options = {}) {
  // Spec 0184 & Spec 0185: SQLite 雙指標健康快取秒級略過 (Smart Cache Skip)
  if (!options.force && !options.inMemoryOnly) {
    try {
      const db = initSqliteLakehouseDb(options.dbPath);
      const { stockStmt, chipStmt } = getVerificationStmts(db);
      const stockRow = stockStmt.get(dateStr);
      const chipRow = chipStmt.get(dateStr);
      const totalCount = stockRow ? Number(stockRow.totalCount) : 0;
      const stockCount = stockRow ? Number(stockRow.stockCount) : 0;
      const etfCount = stockRow ? Number(stockRow.etfCount) : 0;
      const chipCount = chipRow ? Number(chipRow.n) : 0;

      // 雙指標安全快取判定：普通股 >= 1800 且 籌碼 >= 2000 (Spec 0185)
      if (stockCount >= 1800 && chipCount >= 2000) {
        return {
          date: dateStr,
          isTradingDay: true,
          cached: true,
          quotesCount: totalCount,
          stockCount,
          etfCount,
          chipsCount: chipCount,
        };
      }
    } catch (e) {
      // 容錯降級：若 DB 快取查詢失敗，則繼續執行網路抓取
    }
  }


  const fetcher = options.fetcher || defaultFetchJson;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;
  const yyyymmdd = dateStr.replace(/-/g, '');
  const rocDateStr = formatRocDate(dateStr);
  const retries = options.retries !== undefined ? options.retries : 3;
  const retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 2000;

  // 1. TWSE MI_INDEX (上市收盤價量與成交筆數) - Spec 0184 / Ticket 03: 指數退避重試
  let twseQuotesRaw = null;
  try {
    twseQuotesRaw = await retryFetch(
      () =>
        fetcher(
          `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${yyyymmdd}&type=ALLBUT0999&response=json`,
          { signal: options.signal }
        ),
      retries,
      retryDelayMs
    );
  } catch (e) {
    console.warn(`[TWSE MI_INDEX] 下載跳過:`, e.message);
  }

  // 禮儀延遲
  if (throttleMs > 0) await sleep(throttleMs);

  // 2. TWSE T86 (上市三大法人)
  let twseT86Raw = null;
  try {
    twseT86Raw = await retryFetch(
      () =>
        fetcher(
          `https://www.twse.com.tw/rwd/zh/fund/T86?date=${yyyymmdd}&selectType=ALLBUT0999&response=json`,
          { signal: options.signal }
        ),
      retries,
      retryDelayMs
    );
  } catch (e) {
    console.warn(`[TWSE T86] 下載跳過:`, e.message);
  }

  if (throttleMs > 0) await sleep(throttleMs);

  // 3. TPEx 1430 (上櫃收盤價量與成交筆數)
  let tpexQuotesRaw = null;
  try {
    tpexQuotesRaw = await retryFetch(
      () =>
        fetcher(
          `https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${rocDateStr}&se=AL&_=${Date.now()}`,
          { signal: options.signal }
        ),
      retries,
      retryDelayMs
    );
  } catch (e) {
    console.warn(`[TPEx 1430] 下載跳過:`, e.message);
  }

  if (throttleMs > 0) await sleep(throttleMs);

  // 4. TPEx T86 (上櫃三大法人)
  let tpexT86Raw = null;
  try {
    tpexT86Raw = await retryFetch(
      () =>
        fetcher(
          `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDateStr}&_=${Date.now()}`,
          { signal: options.signal }
        ),
      retries,
      retryDelayMs
    );
  } catch (e) {
    console.warn(`[TPEx T86] 下載跳過:`, e.message);
  }


  // 休市日辨識
  const twseStat = twseQuotesRaw?.stat || '';
  const twseHasData = twseQuotesRaw?.tables && twseQuotesRaw.tables.length > 0 && !twseStat.includes('沒有符合條件');
  const tpexHasData = tpexQuotesRaw?.tables?.[0]?.data?.length > 0 || tpexQuotesRaw?.aaData?.length > 0;

  if (!twseHasData && !tpexHasData) {
    const reason = getHolidayReason(dateStr, 'TW');
    return {
      date: dateStr,
      isTradingDay: false,
      holidayReason: reason,
      quotesCount: 0,
      chipsCount: 0,
    };
  }

  // 解析行情
  const twseQuotes = parseTwseDailyQuotesWithTransactions(twseQuotesRaw, dateStr);
  const tpexQuotes = parseTpexDailyQuotesWithTransactions(tpexQuotesRaw, dateStr);
  const twseQuotesCount = Object.keys(twseQuotes).length;
  const tpexQuotesCount = Object.keys(tpexQuotes).length;

  // Spec 0184 / Ticket 03: 單邊缺失保護
  if ((twseQuotesCount > 0 && tpexQuotesCount === 0) || (twseQuotesCount === 0 && tpexQuotesCount > 0)) {
    return {
      date: dateStr,
      isTradingDay: true,
      hasError: true,
      errorReason: `單邊缺失 (上市: ${twseQuotesCount} 檔, 上櫃: ${tpexQuotesCount} 檔)`,
      quotesCount: twseQuotesCount + tpexQuotesCount,
      chipsCount: 0,
      twseQuotesCount,
      tpexQuotesCount,
    };
  }

  const allQuotes = { ...twseQuotes, ...tpexQuotes };

  // 解析籌碼並正規化 TPEx 代碼
  const twseChips = parseTwseT86BulkData(twseT86Raw);
  const rawTpexChips = parseTpexT86BulkData(tpexT86Raw);
  const tpexChips = {};
  for (const [k, v] of Object.entries(rawTpexChips)) {
    const cleanK = normalizeTwSymbol(k);
    tpexChips[cleanK] = { ...v, symbol: cleanK };
  }
  const allChips = { ...twseChips, ...tpexChips };

  const quotesCount = Object.keys(allQuotes).length;
  const chipsCount = Object.keys(allChips).length;

  if (!options.inMemoryOnly) {
    if (quotesCount > 0) {
      saveTwDailyQuotesBatch(allQuotes, options.dbPath);
    }
    if (chipsCount > 0) {
      saveTwT86ToSqlite(allChips, dateStr, options.dbPath);
    }
  }

  return {
    date: dateStr,
    isTradingDay: true,
    quotesCount,
    chipsCount,
    twseQuotesCount,
    tpexQuotesCount,
  };
}


/**
 * 執行完整日期驅動歷史回補循環 (Spec 0184 / Ticket 05)
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function runTwDateDrivenBackfill(options = {}) {
  const days = options.days || 250;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;
  const dates = Array.isArray(options.datesOverride) && options.datesOverride.length > 0
    ? options.datesOverride
    : generateTradeDateCandidates(days, options.endDate);
  const startedAt = options.startedAt || Date.now();

  console.log(`[Spec 0168 / Spec 0184] 啟動台股日期驅動歷史全回補管線...`);
  console.log(`[*] 目標交易日數: ${dates.length} 天 (${dates[dates.length - 1]} ~ ${dates[0]})`);
  console.log(`[*] 防爬蟲間隔: ${throttleMs}ms / 請求`);

  let totalTradingDays = 0;
  let totalQuotesIngested = 0;
  let totalChipsIngested = 0;
  let failedDates = [];

  const fetchHandler = typeof options.customFetchDayQuotes === 'function'
    ? options.customFetchDayQuotes
    : (d) => fetchAndIngestTwDailyData(d, {
        throttleMs,
        dbPath: options.dbPath,
        force: options.force,
        signal: options.signal,
      });

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    const progressPct = (((i + 1) / dates.length) * 100).toFixed(1);

    // 計算 ETA 字串
    let etaStr = '';
    if (i > 0) {
      const elapsedMs = Date.now() - startedAt;
      const avgMs = elapsedMs / i;
      const remMs = Math.max(0, Math.round((dates.length - i) * avgMs));
      const remMin = Math.round(remMs / 60000);
      const etaDate = new Date(Date.now() + remMs);
      const hh = String(etaDate.getHours()).padStart(2, '0');
      const mm = String(etaDate.getMinutes()).padStart(2, '0');
      const remText = remMin <= 0 ? '剩餘不到 1 分鐘' : `剩餘約 ${remMin} 分鐘`;
      etaStr = `${remText} (預計 ${hh}:${mm} 完成)`;
    } else {
      etaStr = '預估中...';
    }

    process.stdout.write(`[進度 ${progressPct}% | ${i + 1}/${dates.length} | ${etaStr}] 處理日期: ${dateStr} ... `);

    // 檢查外部取消信號 (Ticket 03)
    if (options.signal && options.signal.aborted) {
      console.log(`⚠️ 任務已收到外部取消信號，終止後續處理`);
      break;
    }

    let isCachedDate = false;
    try {
      // Spec 0187 / Ticket 02: 單日看門狗熔斷保護 (限時 45 秒)
      const perDateTimeoutMs = options.perDateTimeoutMs || 45000;
      let watchdogTimer = null;
      const watchdogPromise = new Promise((_, reject) => {
        watchdogTimer = setTimeout(() => {
          reject(new Error(`單日處理逾時超過 ${perDateTimeoutMs}ms (觸發看門狗熔斷)`));
        }, perDateTimeoutMs);
      });

      const res = await Promise.race([
        fetchHandler(dateStr),
        watchdogPromise,
      ]).finally(() => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
      });

      if (res.cached) {
        isCachedDate = true;
        totalTradingDays++;
        totalQuotesIngested += res.quotesCount;
        totalChipsIngested += res.chipsCount;
        const stockInfo = res.stockCount !== undefined ? ` [股票: ${res.stockCount}, ETF: ${res.etfCount}]` : '';
        console.log(`✔ 快取命中已在庫 ⚡ 略過 (有效標的: ${res.quotesCount} 檔${stockInfo}, 籌碼: ${res.chipsCount} 筆)`);
      } else if (res.hasError) {
        console.log(`⚠️ 異常: ${res.errorReason} (已推入補漏清單)`);
        failedDates.push({ date: dateStr, reason: res.errorReason });
      } else if (res.isTradingDay) {
        totalTradingDays++;
        totalQuotesIngested += res.quotesCount;
        totalChipsIngested += res.chipsCount;
        console.log(
          `✔ 成功 [上市: ${res.twseQuotesCount || '-'} 檔 | 上櫃: ${res.tpexQuotesCount || '-'} 檔] [籌碼: ${res.chipsCount} 檔]`
        );
      } else {
        const holidayReason = res.holidayReason || getHolidayReason(dateStr, 'TW');
        if (holidayReason) {
          console.log(`ℹ️ [休市日 (${holidayReason})] 略過`);
        } else {
          console.log(`⚠️ [官方無資料（異常）] 略過`);
          failedDates.push({ date: dateStr, reason: '官方回傳無資料或非交易日' });
        }
      }

      if (typeof options.onProgress === 'function') {
        options.onProgress({
          index: i + 1,
          total: dates.length,
          date: dateStr,
          isTradingDay: res.isTradingDay,
          cached: res.cached,
          quotesCount: res.quotesCount,
          stockCount: res.stockCount,
          etfCount: res.etfCount,
          chipsCount: res.chipsCount,
        });
      }
    } catch (err) {
      console.log(`❌ 失敗: ${err.message}`);
      failedDates.push({ date: dateStr, reason: err.message });
    }

    // 每一天處理完畢後的防爬蟲冷卻 (Spec 0189 / Ticket 02: 快取命中時 0ms 零延遲略過)
    if (!isCachedDate && throttleMs > 0 && i < dates.length - 1) {
      await sleep(throttleMs);
    }
  }

  // Spec 0188 / Ticket 06: 看門狗尾盤自動補漏閉環 (少數失敗天數 <= 5 天時發起單輪重試)
  const enableAutoCatchup = options.enableAutoCatchupRetry !== false;
  if (enableAutoCatchup && failedDates.length > 0 && failedDates.length <= 5 && (!options.signal || !options.signal.aborted)) {
    console.log(`\n🔄 [看門狗尾盤自動補漏] 檢測到 ${failedDates.length} 個熔斷或異常天數，啟動冷卻後單輪重試閉環...`);
    if (throttleMs > 0) {
      await sleep(Math.min(throttleMs, 5000));
    }

    const remainingFailed = [];
    for (const failItem of failedDates) {
      const retryDate = failItem.date;
      process.stdout.write(`  [尾盤重試] 重新抓取 ${retryDate} ... `);
      try {
        const retryRes = await fetchHandler(retryDate);
        if (retryRes && !retryRes.hasError && (retryRes.isTradingDay || retryRes.cached)) {
          console.log(`✔ 補漏成功！`);
          totalTradingDays++;
          totalQuotesIngested += retryRes.quotesCount || 0;
          totalChipsIngested += retryRes.chipsCount || 0;
        } else {
          console.log(`❌ 依然失敗: ${retryRes?.errorReason || '無資料'}`);
          remainingFailed.push(failItem);
        }
      } catch (retryErr) {
        console.log(`❌ 依然異常: ${retryErr.message}`);
        remainingFailed.push(failItem);
      }
    }
    failedDates = remainingFailed;
  }

  console.log(`\n========================================`);
  console.log(`🎉 台股日期驅動全回補完成！`);
  console.log(`- 實際交易日數: ${totalTradingDays} 天`);
  console.log(`- 累計入庫收盤日 K: ${totalQuotesIngested} 筆`);
  console.log(`- 累計入庫籌碼紀錄: ${totalChipsIngested} 筆`);
  if (failedDates.length > 0) {
    console.log(`\n⚠️ 以下日期 (${failedDates.length} 天) 存在單邊缺失或異常，請稍後重試或單獨補漏：`);
    for (const f of failedDates) {
      console.log(`  - ${f.date}: ${f.reason}`);
    }
  }
  console.log(`========================================\n`);

  return {
    totalTradingDays,
    totalQuotesIngested,
    totalChipsIngested,
    failedDates,
  };
}


/**
 * 探測台股歷史數據庫中之缺漏交易日 (Spec 0189 / Ticket 01)
 * @param {object} [options]
 * @param {number} [options.maxLookbackDays=250]
 * @param {string} [options.endDate]
 * @param {Date} [options.customNow]
 * @param {string[]} [options.datesOverride]
 * @param {string} [options.dbPath]
 * @returns {{ hasGaps: boolean, gapDates: string[], totalChecked: number, validCount: number, latestInDbDate: string | null }}
 */
function detectTwDateGaps(options = {}) {
  const maxLookbackDays = options.maxLookbackDays || 250;
  const dates = Array.isArray(options.datesOverride) && options.datesOverride.length > 0
    ? options.datesOverride
    : generateTradeDateCandidates(maxLookbackDays, options.endDate, options.customNow);

  const db = initSqliteLakehouseDb(options.dbPath);
  const { stockStmt, chipStmt } = getVerificationStmts(db);

  const gapDates = [];
  let validCount = 0;
  let latestInDbDate = null;

  for (const dateStr of dates) {
    try {
      const stockRow = stockStmt.get(dateStr);
      const chipRow = chipStmt.get(dateStr);
      const stockCount = stockRow ? Number(stockRow.stockCount) : 0;
      const chipCount = chipRow ? Number(chipRow.n) : 0;

      if (stockCount >= 1800 && chipCount >= 2000) {
        validCount++;
        if (!latestInDbDate) {
          latestInDbDate = dateStr;
        }
      } else {
        gapDates.push(dateStr);
      }
    } catch {
      gapDates.push(dateStr);
    }
  }

  return {
    hasGaps: gapDates.length > 0,
    gapDates,
    totalChecked: dates.length,
    validCount,
    latestInDbDate,
  };
}

module.exports = {
  sleep,
  defaultFetchJson,
  generateTradeDateCandidates,
  formatRocDate,
  normalizeTwSymbol,
  parseTwseDailyQuotesWithTransactions,
  parseTpexDailyQuotesWithTransactions,
  saveTwDailyQuotesBatch,
  getVerificationStmts,
  fetchAndIngestTwDailyData,
  detectTwDateGaps,
  runTwDateDrivenBackfill,
};

// 若直接由 Node CLI 執行
if (require.main === module) {
  const args = process.argv.slice(2);
  let days = 250;
  const daysIdx = args.indexOf('--days');
  if (daysIdx !== -1 && args[daysIdx + 1]) {
    days = parseInt(args[daysIdx + 1], 10) || 250;
  }
  runTwDateDrivenBackfill({ days }).catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
}
