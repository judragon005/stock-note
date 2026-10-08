/**
 * merge-otc-split-symbols.cjs
 * daily_candles 與 tw_institutional_chips 櫃買上櫃標的去 O 事務性安全遷移 (Spec 0170 / Ticket 05)
 * 徹底消滅 10/02 資料斷層與代碼撕裂
 */

const { initSqliteLakehouseDb, getSqliteDbConnection } = require('./sqlite-db-core.cjs');

/**
 * 剝除上櫃代碼可能的 'O' 尾綴
 * @param {string} symbol
 * @returns {string}
 */
function normalizeOtcSymbolString(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  const clean = symbol.trim().toUpperCase();
  if (clean.endsWith('O') && /^\d+[A-Z]?O$/.test(clean)) {
    return clean.slice(0, -1);
  }
  return clean;
}

/**
 * 執行 SQLite 數據庫去 O 遷移
 * @param {string} [customDbPath]
 * @returns {{ migratedCandlesSymbols: number, migratedCandlesRows: number, migratedChipsSymbols: number, migratedChipsRows: number }}
 */
function mergeOtcSplitSymbolsInDb(customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);

  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch (e) {
    // 忽略 checkpoint 錯誤
  }

  // 1. 查詢 daily_candles 帶 O 的標的
  const candleSymbolsRows = db.prepare(`
    SELECT DISTINCT symbol FROM daily_candles WHERE symbol GLOB '[0-9]*O'
  `).all();

  // 2. 查詢 tw_institutional_chips 帶 O 的標的
  let chipSymbolsRows = [];
  try {
    chipSymbolsRows = db.prepare(`
      SELECT DISTINCT symbol FROM tw_institutional_chips WHERE symbol GLOB '[0-9]*O'
    `).all();
  } catch (e) {
    // 籌碼表可能未建立
  }

  const upsertCandleStmt = db.prepare(`
    INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      open = CASE WHEN excluded.open > 0 THEN excluded.open ELSE daily_candles.open END,
      high = CASE WHEN excluded.high > 0 THEN MAX(excluded.high, daily_candles.high) ELSE daily_candles.high END,
      low = CASE WHEN excluded.low > 0 THEN MIN(excluded.low, daily_candles.low) ELSE daily_candles.low END,
      close = excluded.close,
      adj_close = excluded.adj_close,
      volume = CASE WHEN excluded.volume > daily_candles.volume THEN excluded.volume ELSE daily_candles.volume END,
      turnover = CASE WHEN excluded.turnover > daily_candles.turnover THEN excluded.turnover ELSE daily_candles.turnover END,
      transactions = CASE WHEN excluded.transactions > daily_candles.transactions THEN excluded.transactions ELSE daily_candles.transactions END
  `);

  const deleteCandleStmt = db.prepare(`DELETE FROM daily_candles WHERE symbol = ?`);

  let upsertChipStmt = null;
  let deleteChipStmt = null;
  try {
    upsertChipStmt = db.prepare(`
      INSERT INTO tw_institutional_chips (
        symbol, date, foreign_net, trust_net, dealer_net,
        margin_balance, short_balance, sbl_balance, day_trade_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol, date) DO UPDATE SET
        foreign_net = excluded.foreign_net,
        trust_net = excluded.trust_net,
        dealer_net = excluded.dealer_net,
        margin_balance = CASE WHEN excluded.margin_balance IS NOT NULL THEN excluded.margin_balance ELSE tw_institutional_chips.margin_balance END,
        short_balance = CASE WHEN excluded.short_balance IS NOT NULL THEN excluded.short_balance ELSE tw_institutional_chips.short_balance END,
        sbl_balance = CASE WHEN excluded.sbl_balance IS NOT NULL THEN excluded.sbl_balance ELSE tw_institutional_chips.sbl_balance END,
        day_trade_rate = CASE WHEN excluded.day_trade_rate IS NOT NULL THEN excluded.day_trade_rate ELSE tw_institutional_chips.day_trade_rate END
    `);
    deleteChipStmt = db.prepare(`DELETE FROM tw_institutional_chips WHERE symbol = ?`);
  } catch (e) {}

  let migratedCandlesSymbols = 0;
  let migratedCandlesRows = 0;
  let migratedChipsSymbols = 0;
  let migratedChipsRows = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    // 處理 daily_candles
    for (const { symbol: srcSym } of candleSymbolsRows) {
      const targetSym = normalizeOtcSymbolString(srcSym);
      if (targetSym === srcSym) continue;

      const rows = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').all(srcSym);
      for (const r of rows) {
        upsertCandleStmt.run(
          targetSym,
          r.date,
          r.open,
          r.high,
          r.low,
          r.close,
          r.adj_close || r.close,
          r.volume || 0,
          r.turnover || 0,
          r.transactions || 0
        );
        migratedCandlesRows++;
      }
      deleteCandleStmt.run(srcSym);
      migratedCandlesSymbols++;
    }

    // 處理 tw_institutional_chips
    if (upsertChipStmt && deleteChipStmt) {
      for (const { symbol: srcSym } of chipSymbolsRows) {
        const targetSym = normalizeOtcSymbolString(srcSym);
        if (targetSym === srcSym) continue;

        const rows = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ?').all(srcSym);
        for (const r of rows) {
          upsertChipStmt.run(
            targetSym,
            r.date,
            r.foreign_net || 0,
            r.trust_net || 0,
            r.dealer_net || 0,
            r.margin_balance || null,
            r.short_balance || null,
            r.sbl_balance || null,
            r.day_trade_rate || null
          );
          migratedChipsRows++;
        }
        deleteChipStmt.run(srcSym);
        migratedChipsSymbols++;
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch (e) {}

  return {
    migratedCandlesSymbols,
    migratedCandlesRows,
    migratedChipsSymbols,
    migratedChipsRows,
  };
}

if (require.main === module) {
  console.log('[*] 開始執行 SQLite 櫃買標的去 O 事務性遷移...');
  const res = mergeOtcSplitSymbolsInDb();
  console.log(`✔ 遷移完成：
  - 日 K 標的數：${res.migratedCandlesSymbols} 檔，累計記錄：${res.migratedCandlesRows} 筆
  - 籌碼標的數：${res.migratedChipsSymbols} 檔，累計記錄：${res.migratedChipsRows} 筆`);
}

module.exports = {
  normalizeOtcSymbolString,
  mergeOtcSplitSymbolsInDb,
};
