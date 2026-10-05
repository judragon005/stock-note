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
 * 批次寫入 Lakehouse SQLite macro_sentiment_daily 表
 */
function ingestMacroSentimentToDb(data, customDbPath) {
  if (!data || !data.date) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO macro_sentiment_daily (
      date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y,
      cnn_fear_greed_score, vix_close, tw_put_call_ratio, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    data.date,
    data.riskFreeRate3m ?? null,
    data.treasuryYield10y ?? null,
    data.yieldSpread10y2y ?? null,
    data.cnnFearGreedScore ?? null,
    data.vixClose ?? null,
    data.twPutCallRatio ?? null,
    Date.now()
  );

  return true;
}

module.exports = {
  parseFredObservations,
  computeYieldSpread,
  parseCnnFearGreedResponse,
  ingestMacroSentimentToDb,
};
