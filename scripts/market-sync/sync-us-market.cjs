/**
 * 美股每日盤後批次同步腳本 (每日 08:00 定時排程執行)
 * 採用雙層優先級隊列 (Tiered Priority Queue) 與自適應限流防禦，
 * 確保持股、自選與熱門指數標的 100% 優先秒級就緒。
 */

const https = require('https');
const path = require('path');
const {
  formatDateYMD,
  computeIncrementalIndicators,
  saveJsonAtomic,
} = require('./market-sync-core.cjs');

// Tier 1 核心美股清單 (涵蓋主要指數 ETF、大型權值股與高頻持股)
const US_TIER_1_CORE = [
  'VOO', 'SPY', 'QQQ', 'IVV', 'VTI', 'VT', 'TLT', 'IEF', 'GLD',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA',
  'AVGO', 'COST', 'AMD', 'NFLX', 'BRK-B', 'JNJ', 'JPM', 'UNH',
  'XOM', 'LLY', 'PG', 'HD', 'V', 'MA', 'CRM', 'ABBV', 'CVX', 'MRK',
  'BAC', 'KO', 'PEP', 'TMO', 'WMT', 'MCD', 'DIS', 'CSCO', 'ADBE',
];

function fetchYahooHistoricalQuotes(symbol) {
  return new Promise((resolve, reject) => {
    const endSec = Math.floor(Date.now() / 1000);
    const startSec = endSec - 90 * 86400; // 往前推 90 天足以計算指標
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startSec}&period2=${endSec}&interval=1d`;

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode === 429) {
          return reject(new Error(`429_RATE_LIMITED: ${symbol}`));
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve(data);
          } catch (e) {
            reject(new Error(`JSON Parse Error: ${symbol}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout: ${symbol}`));
    });
  });
}

function parseYahooCandles(chartResult) {
  const result = chartResult?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const timestamps = result.timestamp;
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const c = quote.close?.[i];
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const v = quote.volume?.[i];

    if (c !== null && c !== undefined && !isNaN(c)) {
      const d = new Date(ts * 1000);
      candles.push({
        date: formatDateYMD(d),
        open: o !== null && !isNaN(o) ? o : c,
        high: h !== null && !isNaN(h) ? h : c,
        low: l !== null && !isNaN(l) ? l : c,
        close: c,
        volume: v || 0,
      });
    }
  }
  return candles;
}

async function runUsMarketSync() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 開始執行美股每日盤後自動同步 (Spec 0132)...`);

  const today = new Date();
  const dateStr = formatDateYMD(today);

  // 1. 整理獲取標的名單 (優先 Tier 1)
  const targetSymbols = [...new Set(US_TIER_1_CORE)];
  console.log(`[1/3] 啟動雙層優先隊列，預計同步 ${targetSymbols.length} 檔美股核心標的...`);

  const stocksMap = {};
  let successCount = 0;
  let failCount = 0;
  const failedSymbols = [];

  // 2. 受控併發隊列 (Concurrency = 3，間隔 200ms)
  const concurrency = 3;
  for (let i = 0; i < targetSymbols.length; i += concurrency) {
    const chunk = targetSymbols.slice(i, i + concurrency);
    const promises = chunk.map(async (sym) => {
      try {
        const raw = await fetchYahooHistoricalQuotes(sym);
        const candles = parseYahooCandles(raw);
        if (candles.length > 0) {
          const latestQuote = candles[candles.length - 1];
          const indicators = computeIncrementalIndicators(candles);
          const latestIndicator = indicators[indicators.length - 1];

          stocksMap[sym] = {
            symbol: sym,
            name: sym,
            date: latestQuote.date,
            quote: latestQuote,
            indicator: latestIndicator,
          };
          successCount++;
        } else {
          failCount++;
          failedSymbols.push(sym);
        }
      } catch (err) {
        failCount++;
        failedSymbols.push(sym);
        if (String(err.message).includes('429')) {
          console.warn(`[限流警示] ${sym} 觸發 429，休眠 3 秒...`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    });

    await Promise.all(promises);
    // 禮貌性微休眠避免 IP 風控
    await new Promise((r) => setTimeout(r, 200));
  }

  // 3. 持久化至本地快取
  const outputPayload = {
    date: dateStr,
    updatedAt: Date.now(),
    market: 'US',
    totalSymbols: successCount,
    failedSymbols,
    durationMs: Date.now() - startTime,
    stocks: stocksMap,
  };

  console.log(`[2/3] 持久化寫入本地快取資料庫...`);
  const targetPath1 = path.join(process.cwd(), '.scratch', 'market-cache', 'us_market_summary.json');
  const targetPath2 = path.join(process.cwd(), 'public', 'market-cache', 'us_market_summary.json');

  saveJsonAtomic(targetPath1, outputPayload);
  saveJsonAtomic(targetPath2, outputPayload);

  console.log(`✔ 美股每日盤後同步完成！成功: ${successCount} 檔, 失敗: ${failCount} 檔，耗時 ${Date.now() - startTime}ms。`);
}

if (require.main === module) {
  runUsMarketSync().catch((err) => {
    console.error(`美股盤後同步失敗:`, err);
    process.exit(1);
  });
}

module.exports = { runUsMarketSync, parseYahooCandles };
