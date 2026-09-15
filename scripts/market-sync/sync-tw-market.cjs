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

function fetchJson(url, options = {}) {
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
        timeout: 15000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
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
      reject(new Error(`請求逾時 (15s): ${url}`));
    });
  });
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

async function runTwMarketSync() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 開始執行台股全市場盤後自動同步 (Spec 0132)...`);

  const today = new Date();
  // 檢查是否週末
  const day = today.getDay();
  if (day === 0 || day === 6) {
    console.log(`[略過] 今日為週末 (Day ${day})，台股休市無交易數據。`);
    return;
  }

  const dateStr = formatDateYMD(today);
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

  const rocYear = today.getFullYear() - 1911;
  const rocDateStr = `${rocYear}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  try {
    tpexQuotesRaw = await retryFetch(() =>
      fetchJson(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${rocDateStr}&se=AL&_=${Date.now()}`)
    );
  } catch (e) {
    console.warn(`TPEx Quotes 下載警告:`, e.message);
  }

  try {
    tpexT86Raw = await retryFetch(() =>
      fetchJson(`https://www.tpex.org.tw/web/stock/3insti/daily_trades/3itrade_hedge_result.php?l=zh-tw&se=EW&t=D&d=${rocDateStr}&_=${Date.now()}`)
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

  console.log(`[4/4] 持久化寫入本地快取資料庫...`);
  const targetPath1 = path.join(process.cwd(), '.scratch', 'market-cache', 'tw_market_summary.json');
  const targetPath2 = path.join(process.cwd(), 'public', 'market-cache', 'tw_market_summary.json');

  saveJsonAtomic(targetPath1, outputPayload);
  saveJsonAtomic(targetPath2, outputPayload);

  console.log(`✔ 台股全市場盤後同步完成！共同步 ${successCount} 檔標的，耗時 ${Date.now() - startTime}ms。`);
  console.log(`快取儲存位置: ${targetPath2}`);
}

if (require.main === module) {
  runTwMarketSync().catch((err) => {
    console.error(`台股盤後同步失敗:`, err);
    process.exit(1);
  });
}

module.exports = { runTwMarketSync };
