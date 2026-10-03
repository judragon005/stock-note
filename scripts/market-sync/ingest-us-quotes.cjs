/**
 * ingest-us-quotes.cjs
 * 美股 Yahoo Chart 日 K 限流採集器與還原價計算
 */

const https = require('https');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { normalizeUsSymbol } = require('./market-sync-core.cjs');

function formatDateYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 解析 Yahoo Chart 回應，提取 OHLCV 與還原收盤價 (adj_close)
 * @param {object} chartResult
 * @returns {Array<{ date: string, open: number, high: number, low: number, close: number, adjClose: number, volume: number, turnover: number }>}
 */
function parseYahooChartData(chartResult) {
  const result = chartResult?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const timestamps = result.timestamp;
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const adjQuote = result.indicators?.adjclose?.[0]?.adjclose;
  const candles = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const c = quote.close?.[i];
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const v = quote.volume?.[i];
    const adj = adjQuote?.[i];

    if (c !== null && c !== undefined && !isNaN(c)) {
      const d = new Date(ts * 1000);
      const closePrice = Number(c);
      const openPrice = o !== null && !isNaN(o) ? Number(o) : closePrice;
      const highPrice = h !== null && !isNaN(h) ? Number(h) : closePrice;
      const lowPrice = l !== null && !isNaN(l) ? Number(l) : closePrice;
      const volumeShares = v !== null && !isNaN(v) ? Number(v) : 0;
      const adjClosePrice = adj !== null && adj !== undefined && !isNaN(adj) ? Number(adj) : closePrice;
      const turnover = volumeShares * closePrice;

      candles.push({
        date: formatDateYMD(d),
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        close: closePrice,
        adjClose: adjClosePrice,
        volume: volumeShares,
        turnover,
      });
    }
  }

  return candles;
}

/**
 * 將美股日 K 數列事務寫入 SQLite daily_candles
 * @param {string} symbol
 * @param {Array<object>} candles
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveUsCandlesToSqlite(symbol, candles, customDbPath) {
  if (!symbol || !Array.isArray(candles) || candles.length === 0) {
    return { savedCount: 0 };
  }

  const cleanSym = String(symbol).trim().toUpperCase();
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      adj_close = excluded.adj_close,
      volume = excluded.volume,
      turnover = excluded.turnover
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const c of candles) {
      if (!c || !c.date || c.close === undefined) continue;
      stmt.run(
        cleanSym,
        String(c.date).trim(),
        Number(c.open) || Number(c.close),
        Number(c.high) || Number(c.close),
        Number(c.low) || Number(c.close),
        Number(c.close),
        Number(c.adjClose || c.close),
        Number(c.volume) || 0,
        Number(c.turnover) || 0
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
 * 透過 Yahoo API 抓取特定美股 250 天歷史日 K（帶限流錯誤回傳）
 * @param {string} symbol
 * @param {number} [days=250]
 * @returns {Promise<Array<object>>}
 */
function fetchYahooHistoricalQuotes(symbol, days = 250) {
  return new Promise((resolve, reject) => {
    const endSec = Math.floor(Date.now() / 1000);
    const startSec = endSec - days * 86400 * 1.5; // 往前多推算週末假日
    const requestSym = normalizeUsSymbol(symbol) || symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(requestSym)}?period1=${Math.floor(startSec)}&period2=${endSec}&interval=1d`;

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: 12000,
      },
      (res) => {
        if (res.statusCode === 429) {
          return reject(new Error(`429_RATE_LIMITED: ${symbol}`));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP_${res.statusCode}: ${symbol}`));
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const candles = parseYahooChartData(data);
            resolve(candles);
          } catch (e) {
            reject(new Error(`JSON_PARSE_ERROR: ${symbol}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`TIMEOUT: ${symbol}`));
    });
  });
}

module.exports = {
  formatDateYMD,
  parseYahooChartData,
  saveUsCandlesToSqlite,
  fetchYahooHistoricalQuotes,
};
