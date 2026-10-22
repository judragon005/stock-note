/**
 * 台股全市場每日盤後批次同步腳本 (每日 16:00 定時排程執行)
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

async function runTwMarketSync(targetDateInput) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 開始執行台股全市場盤後自動同步 (Spec 0132)...`);

  let targetDate = new Date();
  if (targetDateInput) {
    const clean = String(targetDateInput).replace(/-/g, '');
    if (/^\d{8}$/.test(clean)) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      targetDate = new Date(y, m, d);
    }
  }

  const dateStr = formatDateYMD(targetDate);

  // 營業日與休市守衛 (排除週末、法定休市與天災停市，Spec 0190)
  if (!targetDateInput && !isTradingDay(dateStr, 'TW')) {
    const reason = getHolidayReason(dateStr, 'TW') || '非營業日';
    console.log(`[略過] 今日 (${dateStr}) 為台股休市日 [${reason}]，無交易數據，安全退出。`);
    return;
  }

  const yyyymmdd = dateStr.replace(/-/g, '');


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

  const rocYear = targetDate.getFullYear() - 1911;
  const rocDateStr = `${rocYear}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')}`;

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
  const allChips = { ...twseChips, ...tpexChips };

  const allSymbols = new Set([...Object.keys(allQuotes), ...Object.keys(allChips)]);
  if (allSymbols.size === 0) {
    console.log(`[提示] 目標日期 (${dateStr}) 官方尚未發布盤後數據（TWSE/TPEx 通常於 15:30~16:00 結算產出）或該日為非交易休市日。`);
    console.log(`[防禦保護] 本次未獲取到有效標的，安全退出且不覆蓋既有本地快取。`);
    return;
  }

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

  console.log(`[4/4] 持久化寫入本地快取資料庫與 SQLite 數據湖倉...`);
  const projectRoot = path.resolve(__dirname, '../../');
  const targetPath1 = path.join(projectRoot, '.scratch', 'market-cache', 'tw_market_summary.json');
  const targetPath2 = path.join(projectRoot, 'public', 'market-cache', 'tw_market_summary.json');

  saveJsonAtomic(targetPath1, outputPayload);
  saveJsonAtomic(targetPath2, outputPayload);

  // 同步寫入本機 SQLite 數據湖倉 (Spec 0159 & Spec 0163)
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

    const quoteRes = saveTwQuotesToSqlite(allQuotes);
    console.log(`✔ SQLite 湖倉入庫：已寫入 ${quoteRes.savedCount} 檔台股日 K 收盤行情 (daily_candles)`);

    const chipRes = saveTwT86ToSqlite(allChips, dateStr);
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

    const extRes = saveTwExtendedChipsToSqlite(combinedExtMap, dateStr);
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

    const valRes = saveTwValuationToSqlite(combinedValMap, dateStr);
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
    if (valEnrichCount > 0) {
      saveJsonAtomic(targetPath1, outputPayload);
      saveJsonAtomic(targetPath2, outputPayload);
      console.log(`✔ 市場摘要更新：已將 ${valEnrichCount} 檔官方估值注入 tw_market_summary.json`);
    }

    // 6. 節奏化自動附掛任務 (Cadence Sync - Spec 0198)
    // 6.1 每日除權除息預告日程
    try {
      const { runCorporateActionsIngestion } = require('./ingest-tw-corporate-actions.cjs');
      await runCorporateActionsIngestion();
    } catch (caErr) {
      console.warn(`[CadenceSync] 除權除息同步警告:`, caErr.message);
    }

    // 6.1.1 每日全市場 ETF 收盤官方淨值與折溢價 (Spec 0203 Ticket 05)
    try {
      const { fetchAndIngestEtfDailyNav } = require('./ingest-macro-sentiment.cjs');
      const etfNavRes = await fetchAndIngestEtfDailyNav(null, dateStr);
      if (etfNavRes.success) {
        console.log(`✔ [CadenceSync] 成功入庫 ${etfNavRes.count} 檔 ETF 官方每日淨值與折溢價至 etf_daily_nav`);
      }
    } catch (etfNavErr) {
      console.warn(`[CadenceSync] ETF 淨值同步警告:`, etfNavErr.message);
    }

    // 6.2 每週五盤後（大於 18:30）自動更新 TDCC 集保千張大戶
    const dayOfWeek = targetDate.getDay();
    const currentHour = new Date().getHours();
    if (dayOfWeek === 5 && currentHour >= 18) {
      try {
        const { runTdccIngestion } = require('./ingest-tw-tdcc.cjs');
        await runTdccIngestion();
      } catch (tdccErr) {
        console.warn(`[CadenceSync] TDCC 集保同步警告:`, tdccErr.message);
      }
    }

    // 6.3 每月 1~11 號自動更新月營收
    const dayOfMonth = targetDate.getDate();
    if (dayOfMonth >= 1 && dayOfMonth <= 11) {
      try {
        const { runMonthlyRevenueIngestion } = require('./ingest-tw-monthly-revenue.cjs');
        await runMonthlyRevenueIngestion();
      } catch (revErr) {
        console.warn(`[CadenceSync] 月營收同步警告:`, revErr.message);
      }
    }
  } catch (sqliteErr) {
    console.warn(`[SQLite 寫入警告]:`, sqliteErr.message);
  }

  console.log(`✔ 台股全市場盤後同步完成！共同步 ${successCount} 檔標的，耗時 ${Date.now() - startTime}ms。`);
  console.log(`快取儲存位置: ${targetPath2}`);
}

if (require.main === module) {
  const customDateArg = process.argv[2] || null;
  runTwMarketSync(customDateArg).catch((err) => {
    console.error(`台股盤後同步失敗:`, err);
    process.exit(1);
  });
}

module.exports = { runTwMarketSync };
