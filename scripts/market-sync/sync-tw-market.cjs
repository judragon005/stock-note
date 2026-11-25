/**
 * 台股全市場每日盤後批次同步腳本 (每日 16:45 定時排程執行)
 * 單次整包抓取 TWSE/TPEx 官方籌碼日報與收盤行情，本地計算技術指標並落地快取
 */

const https = require('https');
const http = require('http');
const path = require('path');
const {
  formatDateYMD,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  parseTwseDailyQuotesBulk,
  parseTpexDailyQuotesBulk,
  computeIncrementalIndicators,
  saveJsonAtomic,
} = require('./market-sync-core.cjs');
const { isTradingDay, getHolidayReason } = require('./trading-calendar-engine.cjs');


async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;

  // Spec 0205 / 技術債 0052: 雙重信號複合支援 (Compound AbortSignal Integration)
  let signal;
  if (options.signal && timeoutSignal && typeof AbortSignal.any === 'function') {
    signal = AbortSignal.any([options.signal, timeoutSignal]);
  } else {
    signal = options.signal || timeoutSignal;
  }

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
    throw new Error(`回應內容為空 (0 bytes)`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON 解析失敗 (${response.status}): ${err.message}`);
  }
}


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
 * 明確鎖定 Asia/Taipei 時區取得目標日期上下文，不依賴 OS 本地時區 (Spec 0239 T02)
 * @param {string | null | undefined} targetDateInput 可選目標日期 (YYYY-MM-DD 或 YYYYMMDD)
 * @param {Date} [now=new Date()] 基準時間
 * @returns {{ year: number, month: number, day: number, dateStr: string, yyyymmdd: string, rocYear: number, rocDateStr: string, dayOfWeek: number, dayOfMonth: number, currentHour: number }}
 */
function getTaipeiDateContext(targetDateInput, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(now);
  let year = 1970;
  let month = 1;
  let day = 1;
  let currentHour = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') currentHour = parseInt(p.value, 10) % 24;
  }

  if (targetDateInput) {
    const clean = String(targetDateInput).replace(/-/g, '').trim();
    if (/^\d{8}$/.test(clean)) {
      year = parseInt(clean.substring(0, 4), 10);
      month = parseInt(clean.substring(4, 6), 10);
      day = parseInt(clean.substring(6, 8), 10);
    }
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${year}-${mm}-${dd}`;
  const yyyymmdd = `${year}${mm}${dd}`;
  const rocYear = year - 1911;
  const rocDateStr = `${rocYear}/${mm}/${dd}`;
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return {
    year,
    month,
    day,
    dateStr,
    yyyymmdd,
    rocYear,
    rocDateStr,
    dayOfWeek,
    dayOfMonth: day,
    currentHour,
  };
}

async function runTwMarketSync(targetDateInput) {
  const startTime = Date.now();
  const opts =
    typeof targetDateInput === 'string'
      ? { targetDate: targetDateInput }
      : targetDateInput && typeof targetDateInput === 'object'
        ? targetDateInput
        : {};
  const explicitTargetDate = opts.targetDate || null;
  const customDbPath = opts.customDbPath || opts.dbPath || undefined;
  const now = opts.now || new Date();
  const writeStaticCache = opts.writeStaticCache === true;

  console.log(`[${new Date().toISOString()}] 開始執行台股全市場盤後自動同步 (Spec 0132 / Spec 0246)...`);

  const twCtx = getTaipeiDateContext(explicitTargetDate, now);
  const { dateStr, yyyymmdd, rocDateStr, dayOfWeek, dayOfMonth, currentHour } = twCtx;

  // 營業日與休市守衛 (排除週末、法定休市與天災停市，Spec 0190 / Spec 0246 Ticket 02)
  if (!explicitTargetDate && !opts.force && !isTradingDay(dateStr, 'TW')) {
    const reason = getHolidayReason(dateStr, 'TW') || '非營業日';
    console.log(`[略過] 今日 (${dateStr}) 為台股休市日 [${reason}]，無交易數據，安全退出。`);
    return {
      ok: true,
      skipped: true,
      date: dateStr,
      reason,
      durationMs: Date.now() - startTime,
    };
  }


  console.log(`[1/4] 抓取 TWSE 台灣證交所全市場收盤行情與 T86 籌碼日報 (日期: ${yyyymmdd})...`);
  let twseQuotesRaw = null;
  let twseT86Raw = null;

  try {
    twseQuotesRaw = await retryFetch(() =>
      fetchJson(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${yyyymmdd}&type=ALLBUT0999&response=json`)
    );
  } catch (e) {
    console.warn(`TWSE MI_INDEX 下載警告:`, e.message);
  }

  try {
    twseT86Raw = await retryFetch(() =>
      fetchJson(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${yyyymmdd}&selectType=ALLBUT0999&response=json`)
    );
  } catch (e) {
    console.warn(`TWSE T86 下載警告:`, e.message);
  }

  console.log(`[2/4] 抓取 TPEx 證券櫃檯買賣中心全市場收盤行情與 T86 籌碼日報...`);
  let tpexQuotesRaw = null;
  let tpexT86Raw = null;

  try {
    tpexQuotesRaw = await retryFetch(() =>
      fetchJson(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${rocDateStr}&se=AL&_=${Date.now()}`)
    );
  } catch (e) {
    console.warn(`TPEx Quotes 下載警告:`, e.message);
  }

  try {
    tpexT86Raw = await retryFetch(() =>
      fetchJson(`https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D&d=${rocDateStr}&_=${Date.now()}`)
    );
  } catch (e) {
    console.warn(`TPEx T86 下載警告:`, e.message);
  }

  console.log(`[3/4] 批次聚合全市場個股收盤行情、三大法人籌碼與增量指標...`);
  const twseQuotes = parseTwseDailyQuotesBulk(twseQuotesRaw, dateStr);
  const tpexQuotes = parseTpexDailyQuotesBulk(tpexQuotesRaw, dateStr);
  const allQuotes = { ...twseQuotes, ...tpexQuotes };

  const twseChips = parseTwseT86BulkData(twseT86Raw);
  const tpexChips = parseTpexT86BulkData(tpexT86Raw);
  const twseChipsCount = Object.keys(twseChips).length;
  const tpexChipsCount = Object.keys(tpexChips).length;

  const allSymbols = new Set([...Object.keys(allQuotes), ...Object.keys(twseChips), ...Object.keys(tpexChips)]);
  if (allSymbols.size === 0) {
    console.log(`[提示] 目標日期 (${dateStr}) 官方尚未發布盤後數據（TWSE/TPEx 通常於 15:30~16:00 結算產出）或該日為非交易休市日。`);
    console.log(`[防禦保護] 本次未獲取到有效標的，安全退出且不覆蓋既有本地快取。`);
    return;
  }

  // Spec 0218 Ticket 01 (#434): 三大法人雙邊完整性檢查 (TWSE 與 TPEx 籌碼筆數均須 > 500 筆)
  if (twseChipsCount <= 500 || tpexChipsCount <= 500) {
    console.warn(`[三大法人雙邊完整性守衛] 目標日期 (${dateStr}) 籌碼尚未完全結算或單邊缺失 (上市 TWSE: ${twseChipsCount} 筆, 上櫃 TPEx: ${tpexChipsCount} 筆，門檻需雙邊 > 500)。`);
    console.warn(`[防禦保護] 判定為未結算，安全退出且絕不寫入單邊殘缺籌碼或覆蓋全市場快照。`);
    return;
  }

  const allChips = { ...twseChips, ...tpexChips };

  const stocksMap = {};

  let successCount = 0;
  for (const sym of allSymbols) {
    const quote = allQuotes[sym] || null;
    const chips = allChips[sym] || null;

    // 增量指標計算 (單根模擬或基於當前價)
    const candles = quote ? [quote] : [];
    const indicators = computeIncrementalIndicators(candles);
    const latestIndicator = indicators.length > 0 ? indicators[indicators.length - 1] : null;

    stocksMap[sym] = {
      symbol: sym,
      name: chips?.name || sym,
      date: dateStr,
      quote,
      chips,
      indicator: latestIndicator,
    };
    successCount++;
  }

  const outputPayload = {
    date: dateStr,
    updatedAt: Date.now(),
    market: 'TW',
    totalSymbols: successCount,
    durationMs: Date.now() - startTime,
    stocks: stocksMap,
  };

  console.log(`[4/4] 持久化寫入 SQLite 數據湖倉...`);
  const projectRoot = path.resolve(__dirname, '../../');
  const targetPath1 = path.join(projectRoot, '.scratch', 'market-cache', 'tw_market_summary.json');
  const targetPath2 = path.join(projectRoot, 'public', 'market-cache', 'tw_market_summary.json');

  if (writeStaticCache) {
    saveJsonAtomic(targetPath1, outputPayload);
    saveJsonAtomic(targetPath2, outputPayload);
  }

  // 同步寫入本機 SQLite 數據湖倉 (Spec 0159 & Spec 0163 & Spec 0246 Ticket 02: 貫穿 customDbPath)
  try {
    const { saveTwQuotesToSqlite } = require('./ingest-tw-quotes.cjs');
    const { saveTwT86ToSqlite } = require('./ingest-tw-t86.cjs');
    const {
      parseTwseMargin,
      parseTpexMargin,
      parseTwseSbl,
      parseTwseDayTrade,
      saveTwExtendedChipsToSqlite,
    } = require('./ingest-tw-extended-chips.cjs');
    const {
      parseTwseBwibbu,
      parseTpexPeratio,
      saveTwValuationToSqlite,
    } = require('./ingest-tw-valuation.cjs');

    const quoteRes = saveTwQuotesToSqlite(allQuotes, customDbPath);
    console.log(`✔ SQLite 湖倉入庫：已寫入 ${quoteRes.savedCount} 檔台股日 K 收盤行情 (daily_candles)`);

    const chipRes = saveTwT86ToSqlite(allChips, dateStr, customDbPath);
    console.log(`✔ SQLite 湖倉入庫：已寫入 ${chipRes.savedCount} 檔三大法人買賣超記錄 (tw_institutional_chips)`);

    // 抓取並解析 TWSE/TPEx 擴展籌碼 (融資融券、借券賣出 SBL、當日沖銷) (Spec 0196 Ticket 01)
    console.log(`[*] 抓取 TWSE/TPEx 信用交易、借券賣出與當沖日報...`);
    let marginRaw = null;
    let tpexMarginRaw = null;
    let sblRaw = null;
    let dayTradeRaw = null;

    try {
      marginRaw = await retryFetch(() =>
        fetchJson(`https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=${yyyymmdd}&selectType=ALL&response=json`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TWSE MI_MARGN 下載警告:`, e.message);
    }

    try {
      tpexMarginRaw = await retryFetch(() =>
        fetchJson(`https://www.tpex.org.tw/openapi/v1/tpex_mainboard_margin_balance`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TPEx Margin OpenAPI 下載警告:`, e.message);
    }

    try {
      sblRaw = await retryFetch(() =>
        fetchJson(`https://www.twse.com.tw/rwd/zh/marginTrading/TWT93U?date=${yyyymmdd}&response=json`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TWSE TWT93U 下載警告:`, e.message);
    }

    try {
      dayTradeRaw = await retryFetch(() =>
        fetchJson(`https://www.twse.com.tw/rwd/zh/dayTrading/TWTB4U?date=${yyyymmdd}&response=json`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TWSE TWTB4U 下載警告:`, e.message);
    }

    const twseMarginMap = parseTwseMargin(marginRaw);
    const tpexMarginMap = parseTpexMargin(tpexMarginRaw);
    const marginMap = { ...twseMarginMap, ...tpexMarginMap };
    const sblMap = parseTwseSbl(sblRaw);
    const dayTradeMap = parseTwseDayTrade(dayTradeRaw);

    const extSymbols = new Set([
      ...Object.keys(marginMap),
      ...Object.keys(sblMap),
      ...Object.keys(dayTradeMap),
    ]);

    const combinedExtMap = {};
    for (const sym of extSymbols) {
      combinedExtMap[sym] = {
        symbol: sym,
        marginBalance: marginMap[sym]?.marginBalance,
        shortBalance: marginMap[sym]?.shortBalance,
        sblBalance: sblMap[sym]?.sblBalance,
        dayTradeRate: dayTradeMap[sym]?.dayTradeRate,
      };
    }

    const extRes = saveTwExtendedChipsToSqlite(combinedExtMap, dateStr, customDbPath);
    console.log(`✔ SQLite 湖倉入庫：已寫入 ${extRes.savedCount} 檔擴展籌碼記錄 (上市+上櫃資券/SBL/當沖) 至 tw_institutional_chips`);

    // 抓取並解析 TWSE/TPEx 官方每日個股估值 (PE/PB/殖利率) (Spec 0196 Ticket 02)
    console.log(`[*] 抓取 TWSE/TPEx 官方每日個股估值 (PE/PB/殖利率)...`);
    let bwibbuRaw = null;
    let tpexValuationRaw = null;

    try {
      bwibbuRaw = await retryFetch(() =>
        fetchJson(`https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=${yyyymmdd}&selectType=ALL&response=json`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TWSE BWIBBU 下載警告:`, e.message);
    }

    try {
      tpexValuationRaw = await retryFetch(() =>
        fetchJson(`https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis`),
        2, 1000
      );
    } catch (e) {
      console.warn(`TPEx PERATIO OpenAPI 下載警告:`, e.message);
    }

    const twseValMap = parseTwseBwibbu(bwibbuRaw);
    const tpexValMap = parseTpexPeratio(tpexValuationRaw);
    const combinedValMap = { ...twseValMap, ...tpexValMap };

    const valRes = saveTwValuationToSqlite(combinedValMap, dateStr, customDbPath);
    console.log(`✔ SQLite 湖倉入庫：已寫入 ${valRes.savedCount} 檔官方估值 (PE/PB/殖利率) 至 tw_valuation_daily`);

    // 同步注入到 stocksMap 並更新 tw_market_summary.json
    let valEnrichCount = 0;
    for (const [sym, valObj] of Object.entries(combinedValMap)) {
      if (stocksMap[sym]) {
        stocksMap[sym].valuation = {
          pe: valObj.pe,
          pb: valObj.pb,
          dividendYield: valObj.dividendYield,
        };
        valEnrichCount++;
      }
    }
    if (writeStaticCache && valEnrichCount > 0) {
      saveJsonAtomic(targetPath1, outputPayload);
      saveJsonAtomic(targetPath2, outputPayload);
      console.log(`✔ 市場摘要更新：已將 ${valEnrichCount} 檔官方估值注入 tw_market_summary.json`);
    }

    // 6. 節奏化自動附掛任務 (Cadence Sync - Spec 0198)
    // 6.1 每日除權除息預告日程
    try {
      const { runCorporateActionsIngestion } = require('./ingest-tw-corporate-actions.cjs');
      await runCorporateActionsIngestion(customDbPath);
    } catch (caErr) {
      console.warn(`[CadenceSync] 除權除息同步警告:`, caErr.message);
    }

    // 6.1.1 每日全市場 ETF 收盤官方淨值與折溢價 (Spec 0203 Ticket 05)
    try {
      const { fetchAndIngestEtfDailyNav } = require('./ingest-macro-sentiment.cjs');
      const etfNavRes = await fetchAndIngestEtfDailyNav(customDbPath, dateStr);
      if (etfNavRes.success) {
        console.log(`✔ [CadenceSync] 成功入庫 ${etfNavRes.count} 檔 ETF 官方每日淨值與折溢價至 etf_daily_nav`);
      }
    } catch (etfNavErr) {
      console.warn(`[CadenceSync] ETF 淨值同步警告:`, etfNavErr.message);
    }

    // 6.2 每週五盤後（台北時間 18:00 後）自動更新 TDCC 集保千張大戶
    if (dayOfWeek === 5 && currentHour >= 18) {
      try {
        const { runTdccIngestion } = require('./ingest-tw-tdcc.cjs');
        await runTdccIngestion(customDbPath);
      } catch (tdccErr) {
        console.warn(`[CadenceSync] TDCC 集保同步警告:`, tdccErr.message);
      }
    }

    // 6.3 每月 1~11 號（台北時區）自動更新月營收
    if (dayOfMonth >= 1 && dayOfMonth <= 11) {
      try {
        const { runMonthlyRevenueIngestion } = require('./ingest-tw-monthly-revenue.cjs');
        await runMonthlyRevenueIngestion(customDbPath);
      } catch (revErr) {
        console.warn(`[CadenceSync] 月營收同步警告:`, revErr.message);
      }
    }
  } catch (sqliteErr) {
    console.warn(`[SQLite 寫入警告]:`, sqliteErr.message);
  }

  console.log(`✔ 台股全市場盤後同步完成！共同步 ${successCount} 檔標的，耗時 ${Date.now() - startTime}ms。`);
  if (writeStaticCache) {
    console.log(`快取儲存位置: ${targetPath2}`);
  }
}

if (require.main === module) {
  const { withGlobalSyncLock, reconcileTwLakehouse } = require('./lakehouse-sync-coordinator.cjs');
  const { MARKET_SETTLEMENT_CUTOFFS } = require('./sync-thresholds.cjs');
  const customDateArg = process.argv[2] || null;
  const taskFn = customDateArg
    ? () => runTwMarketSync(customDateArg)
    : () => reconcileTwLakehouse({ maxLookbackDays: MARKET_SETTLEMENT_CUTOFFS.GAP_CATCHUP_LOOKBACK_DAYS });
  withGlobalSyncLock('cli-tw-sync', taskFn).catch((err) => {
    console.error(`台股盤後同步失敗:`, err);
    process.exit(1);
  });
}

module.exports = { runTwMarketSync, getTaipeiDateContext };
