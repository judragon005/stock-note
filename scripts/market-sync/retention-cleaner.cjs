/**
 * retention-cleaner.cjs
 * 歷史數據滾動視窗修剪與增量空間釋放 (VACUUM Guard)
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

const DEFAULT_KEEP_DAYS = 260;

/**
 * 修剪超過保留天數的過期日 K 線數據
 * @param {string} [symbol] - 若指定則修剪單檔，未指定則修剪全市場標的
 * @param {number} [keepDays=260] - 保留最新天數
 * @param {string} [customDbPath]
 * @returns {{ deletedCandles: number }}
 */
function pruneExpiredCandles(symbol, keepDays = DEFAULT_KEEP_DAYS, customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const targetDays = Math.max(1, keepDays);
  let totalDeleted = 0;

  if (symbol && typeof symbol === 'string') {
    const cleanSym = symbol.trim().toUpperCase();
    // 找出第 keepDays 個最新日期的 cutoff
    const cutoffRow = db
      .prepare('SELECT date FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1 OFFSET ?')
      .get(cleanSym, targetDays - 1);

    if (cutoffRow && cutoffRow.date) {
      const deleteStmt = db.prepare('DELETE FROM daily_candles WHERE symbol = ? AND date < ?');
      const info = deleteStmt.run(cleanSym, cutoffRow.date);
      totalDeleted = info.changes || 0;
    }
    return { deletedCandles: totalDeleted };
  }

  // 全市場批量修剪
  const symbols = db.prepare('SELECT DISTINCT symbol FROM daily_candles').all();
  const cutoffStmt = db.prepare(
    'SELECT date FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1 OFFSET ?'
  );
  const deleteStmt = db.prepare('DELETE FROM daily_candles WHERE symbol = ? AND date < ?');

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const row of symbols) {
      const cutoff = cutoffStmt.get(row.symbol, targetDays - 1);
      if (cutoff && cutoff.date) {
        const info = deleteStmt.run(row.symbol, cutoff.date);
        totalDeleted += info.changes || 0;
      }
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { deletedCandles: totalDeleted };
}

/**
 * 修剪超過保留天數的過期法人與信用交易籌碼數據
 * @param {string} [symbol]
 * @param {number} [keepDays=500]
 * @param {string} [customDbPath]
 * @returns {{ deletedChips: number }}
 */
function pruneExpiredChips(symbol, keepDays = DEFAULT_KEEP_DAYS, customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const targetDays = Math.max(1, keepDays);
  let totalDeleted = 0;

  if (symbol && typeof symbol === 'string') {
    const cleanSym = symbol.trim().toUpperCase();
    const cutoffRow = db
      .prepare('SELECT date FROM tw_institutional_chips WHERE symbol = ? ORDER BY date DESC LIMIT 1 OFFSET ?')
      .get(cleanSym, targetDays - 1);

    if (cutoffRow && cutoffRow.date) {
      const deleteStmt = db.prepare('DELETE FROM tw_institutional_chips WHERE symbol = ? AND date < ?');
      const info = deleteStmt.run(cleanSym, cutoffRow.date);
      totalDeleted = info.changes || 0;
    }
    return { deletedChips: totalDeleted };
  }

  const symbols = db.prepare('SELECT DISTINCT symbol FROM tw_institutional_chips').all();
  const cutoffStmt = db.prepare(
    'SELECT date FROM tw_institutional_chips WHERE symbol = ? ORDER BY date DESC LIMIT 1 OFFSET ?'
  );
  const deleteStmt = db.prepare('DELETE FROM tw_institutional_chips WHERE symbol = ? AND date < ?');

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const row of symbols) {
      const cutoff = cutoffStmt.get(row.symbol, targetDays - 1);
      if (cutoff && cutoff.date) {
        const info = deleteStmt.run(row.symbol, cutoff.date);
        totalDeleted += info.changes || 0;
      }
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { deletedChips: totalDeleted };
}

/**
 * 執行增量空間釋放 (Incremental VACUUM)
 * @param {number} [pages=500]
 * @param {string} [customDbPath]
 * @returns {{ success: boolean, pages: number }}
 */
function runIncrementalVacuum(pages = 500, customDbPath) {
  const db = getSqliteDbConnection(customDbPath);
  try {
    db.exec(`PRAGMA incremental_vacuum(${Math.max(1, pages)});`);
    return { success: true, pages };
  } catch (err) {
    // 若非 auto_vacuum=incremental 模式，以標準 VACUUM 降級處理或忽略
    try {
      db.exec('VACUUM;');
      return { success: true, pages };
    } catch (vacuumErr) {
      return { success: false, pages, error: vacuumErr.message };
    }
  }
}

module.exports = {
  DEFAULT_KEEP_DAYS,
  pruneExpiredCandles,
  pruneExpiredChips,
  runIncrementalVacuum,
};
