/**
 * ingest-macro-sentiment.cjs
 * 宏觀殖利率與市場情緒指標排程入庫模組 (Spec 0167 / Ticket 15)
 * 資料來源：FRED API (無風險利率) + CNN Fear & Greed (公開情緒指標)
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 解析 FRED 序列數據，取得最後一個非空有效數值
 */
function parseFredObservations(rawData) {
  if (!rawData || !Array.isArray(rawData.observations) || rawData.observations.length === 0) {
    return null;
  }

  // 從最新往回找第一個非 '.' 的有效浮點數
  for (let i = rawData.observations.length - 1; i >= 0; i--) {
    const valStr = String(rawData.observations[i].value).trim();
    if (valStr !== '.' && valStr !== '') {
      const num = parseFloat(valStr);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  return null;
}

/**
 * 計算 10Y - 2Y 美債利差 (殖利率倒掛指標)
 */
function computeYieldSpread(yield10y, yield2y) {
  if (yield10y === null || yield2y === null) return null;
  const spread = yield10y - yield2y;
  return Number(spread.toFixed(2));
}

/**
 * 解析 CNN 恐懼貪婪指數公開 JSON
 */
function parseCnnFearGreedResponse(rawData) {
  if (!rawData || !rawData.fear_and_greed || typeof rawData.fear_and_greed.score !== 'number') {
    return null;
  }
  return Number(rawData.fear_and_greed.score.toFixed(1));
}

/**
 * 批次寫入 Lakehouse SQLite macro_sentiment_daily 表 (Spec 0183 擴充期貨 OI)
 */
function ingestMacroSentimentToDb(data, customDbPath) {
  if (!data || !data.date) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT INTO macro_sentiment_daily (
      date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y,
      cnn_fear_greed_score, vix_close, tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      risk_free_rate_3m = COALESCE(excluded.risk_free_rate_3m, macro_sentiment_daily.risk_free_rate_3m),
      treasury_yield_10y = COALESCE(excluded.treasury_yield_10y, macro_sentiment_daily.treasury_yield_10y),
      yield_spread_10y_2y = COALESCE(excluded.yield_spread_10y_2y, macro_sentiment_daily.yield_spread_10y_2y),
      cnn_fear_greed_score = COALESCE(excluded.cnn_fear_greed_score, macro_sentiment_daily.cnn_fear_greed_score),
      vix_close = COALESCE(excluded.vix_close, macro_sentiment_daily.vix_close),
      tw_put_call_ratio = COALESCE(excluded.tw_put_call_ratio, macro_sentiment_daily.tw_put_call_ratio),
      tw_foreign_futures_oi = COALESCE(excluded.tw_foreign_futures_oi, macro_sentiment_daily.tw_foreign_futures_oi),
      tw_trust_futures_oi = COALESCE(excluded.tw_trust_futures_oi, macro_sentiment_daily.tw_trust_futures_oi),
      updated_at = excluded.updated_at
  `);

  stmt.run(
    data.date,
    data.riskFreeRate3m ?? null,
    data.treasuryYield10y ?? null,
    data.yieldSpread10y2y ?? null,
    data.cnnFearGreedScore ?? null,
    data.vixClose ?? null,
    data.twPutCallRatio ?? null,
    data.twForeignFuturesOi ?? null,
    data.twTrustFuturesOi ?? null,
    Date.now()
  );

  return true;
}

/**
 * 解析台灣期貨交易所 (TAIFEX) 三大法人台指期未平倉 CSV (Spec 0183)
 */
function parseTaifexInstitutionalFuturesCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  let foreignNetOi = 0;
  let trustNetOi = 0;
  let found = false;

  for (const line of lines) {
    // 依逗號切分並去除引號
    const parts = line.split(',').map((p) => p.replace(/["']/g, '').trim());
    if (parts.length < 14) continue;

    const commodity = parts[1]; // 商品名稱
    const identity = parts[2]; // 身份別
    const netOiStr = parts[13]; // 未平倉餘額淨額口數

    if (commodity === '臺股期貨') {
      const netOi = parseInt(netOiStr, 10);
      if (!isNaN(netOi)) {
        if (identity.includes('外資')) {
          foreignNetOi = netOi;
          found = true;
        } else if (identity.includes('投信')) {
          trustNetOi = netOi;
          found = true;
        }
      }
    }
  }

  return found ? { foreignNetOi, trustNetOi } : null;
}

/**
 * 解析證交所/投信公會 ETF 官方收盤淨值與折溢價 (Spec 0183)
 */
function parseTwseEtfNavResponse(rawData, dateStr) {
  if (!Array.isArray(rawData)) return [];

  const results = [];
  for (const item of rawData) {
    const symbol = String(item.a || item.symbol || '').trim();
    if (!symbol) continue;

    const closePrice = parseFloat(item.c || item.close || '0');
    const nav = parseFloat(item.d || item.nav || '0');
    const ratio = parseFloat(item.e || item.ratio || '0');

    if (closePrice > 0 && nav > 0) {
      results.push({
        symbol,
        date: dateStr,
        closePrice,
        nav,
        premiumDiscountRatio: ratio,
      });
    }
  }
  return results;
}

/**
 * 批次寫入 etf_daily_nav 表 (Spec 0183)
 */
function ingestEtfDailyNavToDb(records, customDbPath) {
  if (!Array.isArray(records) || records.length === 0) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO etf_daily_nav (
      symbol, date, close_price, nav, premium_discount_ratio, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of records) {
      stmt.run(r.symbol, r.date, r.closePrice, r.nav, r.premiumDiscountRatio, now);
    }
    db.exec('COMMIT;');
    return true;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  parseFredObservations,
  computeYieldSpread,
  parseCnnFearGreedResponse,
  ingestMacroSentimentToDb,
  parseTaifexInstitutionalFuturesCsv,
  parseTwseEtfNavResponse,
  ingestEtfDailyNavToDb,
};

