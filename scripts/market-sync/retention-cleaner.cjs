/**
 * retention-cleaner.cjs
 * 歷史數據生命週期安全維護與空間重整 (Spec 0188 / Ticket 02)
 * 核心原則：SQLite 湖倉定位為「全市場全歷史 Append-Only」資料庫，
 * 永久封印對 daily_candles 與 tw_institutional_chips 之硬刪除，杜絕歷史數據被排程誤刪。
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

const DEFAULT_KEEP_DAYS = 0; // 0 代表全量保留，永不截斷

/**
 * 修剪超過保留天數的過期日 K 線數據 (Spec 0188: 永久封印刪除，守護全歷史)
 * @param {string} [_symbol]
 * @param {number} [_keepDays=0]
 * @param {string} [customDbPath]
 * @returns {{ deletedCandles: number, protected: boolean }}
 */
function pruneExpiredCandles(_symbol, _keepDays = DEFAULT_KEEP_DAYS, customDbPath) {
  // 安全守護：確保 DB 可正常初始化連線，但不執行任何 DELETE 指令
  initSqliteLakehouseDb(customDbPath);
  return { deletedCandles: 0, protected: true };
}

/**
 * 修剪超過保留天數的過期法人與信用交易籌碼數據 (Spec 0188: 永久封印刪除，守護全歷史籌碼)
 * @param {string} [_symbol]
 * @param {number} [_keepDays=0]
 * @param {string} [customDbPath]
 * @returns {{ deletedChips: number, protected: boolean }}
 */
function pruneExpiredChips(_symbol, _keepDays = DEFAULT_KEEP_DAYS, customDbPath) {
  initSqliteLakehouseDb(customDbPath);
  return { deletedChips: 0, protected: true };
}

/**
 * 執行增量空間釋放與磁碟重組 (Incremental VACUUM / VACUUM)
 * @param {number} [pages=500]
 * @param {string} [customDbPath]
 * @returns {{ success: boolean, pages: number, error?: string }}
 */
function runIncrementalVacuum(pages = 500, customDbPath) {
  const db = getSqliteDbConnection(customDbPath);
  try {
    db.exec(`PRAGMA incremental_vacuum(${Math.max(1, pages)});`);
    return { success: true, pages };
  } catch {
    // 若非 auto_vacuum=incremental 模式，以標準 VACUUM 降級處理
    try {
      db.exec('VACUUM;');
      return { success: true, pages };
    } catch (vacuumErr) {
      return { success: false, pages, error: vacuumErr.message };
    }
  }
}

/**
 * 執行全量維護任務：守護歷史日 K 與籌碼零刪除，並整理資料庫空間 (Spec 0188)
 * @param {string} [customDbPath]
 * @returns {{ deletedCandles: number, deletedChips: number, vacuum: boolean }}
 */
function runFullRetentionMaintenance(customDbPath) {
  pruneExpiredCandles(undefined, 0, customDbPath);
  pruneExpiredChips(undefined, 0, customDbPath);
  const vacRes = runIncrementalVacuum(500, customDbPath);
  return {
    deletedCandles: 0,
    deletedChips: 0,
    vacuum: vacRes.success,
  };
}

module.exports = {
  DEFAULT_KEEP_DAYS,
  pruneExpiredCandles,
  pruneExpiredChips,
  runIncrementalVacuum,
  runFullRetentionMaintenance,
};
