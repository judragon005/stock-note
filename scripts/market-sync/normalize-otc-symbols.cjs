/**
 * normalize-otc-symbols.cjs
 * 櫃買市場 (TPEx) 股票與債券 ETF 代碼正規化遷移腳本 (Spec 0168 / Debt 0043)
 * 自動將結尾帶 'O' 尾綴之台股代碼遷移歸正為標準代碼 (例如 00411AO -> 00411A, 3293O -> 3293)
 * 絕不影響以字母開頭之美股代碼 (例如 AEO, ACCO 等)
 */

const { getSqliteDbConnection, initSqliteLakehouseDb, closeSqliteDb } = require('./sqlite-db-core.cjs');

/**
 * 判斷是否為台股帶 O 尾綴之櫃買代碼
 * 特徵：以數字開頭 (至少 2 碼)，結尾為 'O'，長度大於等於 4
 * @param {string} symbol
 * @returns {boolean}
 */
function isTwOtcWithOSuffix(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  const s = symbol.trim().toUpperCase();
  // 必須以數字開頭，且結尾是 'O'
  // 例如: '3293O', '6488O', '00679BO', '00411AO'
  return /^\d{2,}[A-Z0-9]*O$/.test(s);
}

/**
 * 正規化代碼 (去除結尾單一 'O')
 * @param {string} symbol
 * @returns {string}
 */
function normalizeSymbolCode(symbol) {
  if (isTwOtcWithOSuffix(symbol)) {
    return symbol.slice(0, -1);
  }
  return symbol;
}

/**
 * 執行 SQLite 數據庫之櫃買代碼標準化遷移 (冪等操作)
 * @param {string} [customDbPath]
 * @returns {{ migratedCandles: number, migratedChips: number, migratedSymbols: number }}
 */
function runOtcSymbolNormalization(customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);

  let migratedCandles = 0;
  let migratedChips = 0;
  let migratedSymbols = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. 遷移 daily_candles
    // 找出符合數字開頭帶 O 尾綴的標的
    const candleRows = db
      .prepare("SELECT DISTINCT symbol FROM daily_candles WHERE symbol GLOB '[0-9]*O'")
      .all();

    for (const row of candleRows) {
      const rawSym = row.symbol;
      if (!isTwOtcWithOSuffix(rawSym)) continue;
      const targetSym = normalizeSymbolCode(rawSym);

      // 檢查 transactions 欄位是否存在
      const cols = db.prepare('PRAGMA table_info(daily_candles)').all().map((c) => c.name);
      const hasTransactions = cols.includes('transactions');

      if (hasTransactions) {
        const updateRes = db
          .prepare(
            `
          INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
          SELECT ?, date, open, high, low, close, adj_close, volume, turnover, transactions
          FROM daily_candles WHERE symbol = ?
        `
          )
          .run(targetSym, rawSym);

        migratedCandles += updateRes.changes || 0;
      } else {
        const updateRes = db
          .prepare(
            `
          INSERT OR REPLACE INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
          SELECT ?, date, open, high, low, close, adj_close, volume, turnover
          FROM daily_candles WHERE symbol = ?
        `
          )
          .run(targetSym, rawSym);

        migratedCandles += updateRes.changes || 0;
      }

      db.prepare('DELETE FROM daily_candles WHERE symbol = ?').run(rawSym);
    }

    // 2. 遷移 tw_institutional_chips
    const chipRows = db
      .prepare("SELECT DISTINCT symbol FROM tw_institutional_chips WHERE symbol GLOB '[0-9]*O'")
      .all();

    for (const row of chipRows) {
      const rawSym = row.symbol;
      if (!isTwOtcWithOSuffix(rawSym)) continue;
      const targetSym = normalizeSymbolCode(rawSym);

      const updateRes = db
        .prepare(
          `
        INSERT OR REPLACE INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance, sbl_balance, day_trade_rate)
        SELECT ?, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance, sbl_balance, day_trade_rate
        FROM tw_institutional_chips WHERE symbol = ?
      `
        )
        .run(targetSym, rawSym);

      migratedChips += updateRes.changes || 0;
      db.prepare('DELETE FROM tw_institutional_chips WHERE symbol = ?').run(rawSym);
    }

    // 3. 遷移 symbols_meta
    const metaRows = db
      .prepare("SELECT * FROM symbols_meta WHERE symbol GLOB '[0-9]*O'")
      .all();

    for (const row of metaRows) {
      const rawSym = row.symbol;
      if (!isTwOtcWithOSuffix(rawSym)) continue;
      const targetSym = normalizeSymbolCode(rawSym);

      const updateRes = db
        .prepare(
          `
        INSERT OR REPLACE INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(targetSym, row.name, row.market, row.exchange || 'TPEX', row.type, row.status, Date.now());

      migratedSymbols += updateRes.changes || 0;
      db.prepare('DELETE FROM symbols_meta WHERE symbol = ?').run(rawSym);
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { migratedCandles, migratedChips, migratedSymbols };
}

if (require.main === module) {
  console.log('[OTC 代碼遷移] 啟動櫃買標的標準化遷移 (去 O 尾綴)...');
  const result = runOtcSymbolNormalization();
  console.log(`[OTC 代碼遷移完成] 日 K 遷移: ${result.migratedCandles} 筆, 籌碼遷移: ${result.migratedChips} 筆, 標的註冊表遷移: ${result.migratedSymbols} 筆。`);
}

module.exports = {
  isTwOtcWithOSuffix,
  normalizeSymbolCode,
  runOtcSymbolNormalization,
};
