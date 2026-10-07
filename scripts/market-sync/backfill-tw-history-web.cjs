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
} = require('./market-sync-core.cjs');
const { saveTwT86ToSqlite } = require('./ingest-tw-t86.cjs');

/**
 * 簡易非同步延遲
 */
function sleep(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 日期候選迭代器：往前取得 N 個非週末之交易日候選
 * @param {number} daysCount
 * @param {string} [endDateStr] - YYYY-MM-DD
 * @returns {string[]}
 */
function generateTradeDateCandidates(daysCount = 250, endDateStr) {
  const result = [];
  const current = endDateStr ? new Date(endDateStr) : new Date();

  while (result.length < daysCount) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      result.push(`${y}-${m}-${d}`);
    }
    // 往前推算 1 天
    current.setDate(current.getDate() - 1);
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
 * 預設官方 JSON 請求
 */
function defaultFetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          ...options.headers,
        },
        timeout: 20000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          reject(new Error(`HTTP 重定向 (${res.statusCode}) 至: ${res.headers.location}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP 異常狀態碼: ${res.statusCode}`));
          return;
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (!raw || !raw.trim()) {
            resolve({});
            return;
          }
          try {
            const data = JSON.parse(raw);
            resolve(data);
          } catch (err) {
            reject(new Error(`JSON 解析失敗 (${res.statusCode}): ${err.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP 請求逾時 (20000ms)`));
    });
  });
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

/**
 * 單日官方資料抓取與入庫
 * @param {string} dateStr - YYYY-MM-DD
 * @param {object} [options]
 * @returns {Promise<{ date: string, isTradingDay: boolean, quotesCount: number, chipsCount: number }>}
 */
async function fetchAndIngestTwDailyData(dateStr, options = {}) {
  const fetcher = options.fetcher || defaultFetchJson;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;
  const yyyymmdd = dateStr.replace(/-/g, '');
  const rocDateStr = formatRocDate(dateStr);

  // 1. TWSE MI_INDEX (上市收盤價量與成交筆數)
  let twseQuotesRaw = null;
  try {
    twseQuotesRaw = await fetcher(
      `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${yyyymmdd}&type=ALLBUT0999&response=json`
    );
  } catch (e) {
    console.warn(`[TWSE MI_INDEX] 下載跳過:`, e.message);
  }

  // 禮儀延遲
  if (throttleMs > 0) await sleep(throttleMs);

  // 2. TWSE T86 (上市三大法人)
  let twseT86Raw = null;
  try {
    twseT86Raw = await fetcher(
      `https://www.twse.com.tw/rwd/zh/fund/T86?date=${yyyymmdd}&selectType=ALLBUT0999&response=json`
    );
  } catch (e) {
    console.warn(`[TWSE T86] 下載跳過:`, e.message);
  }

  if (throttleMs > 0) await sleep(throttleMs);

  // 3. TPEx 1430 (上櫃收盤價量與成交筆數)
  let tpexQuotesRaw = null;
  try {
    tpexQuotesRaw = await fetcher(
      `https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${rocDateStr}&se=AL&_=${Date.now()}`
    );
  } catch (e) {
    console.warn(`[TPEx 1430] 下載跳過:`, e.message);
  }

  if (throttleMs > 0) await sleep(throttleMs);

  // 4. TPEx T86 (上櫃三大法人)
  let tpexT86Raw = null;
  try {
    tpexT86Raw = await fetcher(
      `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDateStr}&_=${Date.now()}`
    );
  } catch (e) {
    console.warn(`[TPEx T86] 下載跳過:`, e.message);
  }

  // 休市日辨識
  const twseStat = twseQuotesRaw?.stat || '';
  const twseHasData = twseQuotesRaw?.tables && twseQuotesRaw.tables.length > 0 && !twseStat.includes('沒有符合條件');
  const tpexHasData = tpexQuotesRaw?.tables?.[0]?.data?.length > 0 || tpexQuotesRaw?.aaData?.length > 0;

  if (!twseHasData && !tpexHasData) {
    return {
      date: dateStr,
      isTradingDay: false,
      quotesCount: 0,
      chipsCount: 0,
    };
  }

  // 解析行情
  const twseQuotes = parseTwseDailyQuotesWithTransactions(twseQuotesRaw, dateStr);
  const tpexQuotes = parseTpexDailyQuotesWithTransactions(tpexQuotesRaw, dateStr);
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
  };
}

/**
 * 執行完整日期驅動歷史回補循環
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function runTwDateDrivenBackfill(options = {}) {
  const days = options.days || 250;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;
  const dates = generateTradeDateCandidates(days, options.endDate);

  console.log(`[Spec 0168 / Ticket 07] 啟動台股日期驅動歷史全回補管線...`);
  console.log(`[*] 目標交易日數: ${days} 天 (${dates[dates.length - 1]} ~ ${dates[0]})`);
  console.log(`[*] 防爬蟲間隔: ${throttleMs}ms / 請求`);

  let totalTradingDays = 0;
  let totalQuotesIngested = 0;
  let totalChipsIngested = 0;

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];
    const progressPct = (((i + 1) / dates.length) * 100).toFixed(1);
    process.stdout.write(`[進度 ${progressPct}% | ${i + 1}/${dates.length}] 處理日期: ${dateStr} ... `);

    try {
      const res = await fetchAndIngestTwDailyData(dateStr, {
        throttleMs,
        dbPath: options.dbPath,
      });

      if (res.isTradingDay) {
        totalTradingDays++;
        totalQuotesIngested += res.quotesCount;
        totalChipsIngested += res.chipsCount;
        console.log(`✔ 成功 (收盤行情: ${res.quotesCount} 檔, 籌碼: ${res.chipsCount} 檔)`);
      } else {
        console.log(`[休市日] 略過`);
      }

      if (typeof options.onProgress === 'function') {
        options.onProgress({
          index: i + 1,
          total: dates.length,
          date: dateStr,
          isTradingDay: res.isTradingDay,
          quotesCount: res.quotesCount,
          chipsCount: res.chipsCount,
        });
      }
    } catch (err) {
      console.log(`❌ 失敗: ${err.message}`);
    }

    // 每一天處理完畢後的防爬蟲冷卻
    if (throttleMs > 0 && i < dates.length - 1) {
      await sleep(throttleMs);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 台股日期驅動全回補完成！`);
  console.log(`- 實際交易日數: ${totalTradingDays} 天`);
  console.log(`- 累計入庫收盤日 K: ${totalQuotesIngested} 筆`);
  console.log(`- 累計入庫籌碼紀錄: ${totalChipsIngested} 筆`);
  console.log(`========================================\n`);

  return {
    totalTradingDays,
    totalQuotesIngested,
    totalChipsIngested,
  };
}

module.exports = {
  sleep,
  generateTradeDateCandidates,
  formatRocDate,
  normalizeTwSymbol,
  parseTwseDailyQuotesWithTransactions,
  parseTpexDailyQuotesWithTransactions,
  saveTwDailyQuotesBatch,
  fetchAndIngestTwDailyData,
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
