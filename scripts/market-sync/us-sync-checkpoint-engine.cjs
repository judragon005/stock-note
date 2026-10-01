/**
 * us-sync-checkpoint-engine.cjs
 * 美股 Checkpoint 斷點續傳與重試狀態機
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 記錄或更新特定標的之同步檢查點
 * @param {'TW' | 'US'} market
 * @param {string} symbol
 * @param {'SUCCESS' | 'FAILED' | 'PENDING'} status
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} [errorMsg]
 * @param {string} [customDbPath]
 */
function recordSyncCheckpoint(market, symbol, status, targetDate, errorMsg, customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const cleanSym = String(symbol).trim().toUpperCase();
  const cleanMarket = String(market).trim().toUpperCase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO sync_checkpoints (market, symbol, last_success_date, last_attempt_at, status, error_msg)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(market, symbol) DO UPDATE SET
      last_success_date = CASE WHEN excluded.status = 'SUCCESS' THEN excluded.last_success_date ELSE sync_checkpoints.last_success_date END,
      last_attempt_at = excluded.last_attempt_at,
      status = excluded.status,
      error_msg = excluded.error_msg
  `);

  stmt.run(cleanMarket, cleanSym, String(targetDate).trim(), now, String(status).trim(), errorMsg || null);
}

/**
 * 取得指定標的之同步檢查點
 * @param {'TW' | 'US'} market
 * @param {string} symbol
 * @param {string} [customDbPath]
 * @returns {object | null}
 */
function getSyncCheckpointStatus(market, symbol, customDbPath) {
  const db = getSqliteDbConnection(customDbPath);
  const cleanSym = String(symbol).trim().toUpperCase();
  const cleanMarket = String(market).trim().toUpperCase();

  const row = db
    .prepare('SELECT * FROM sync_checkpoints WHERE market = ? AND symbol = ?')
    .get(cleanMarket, cleanSym);
  return row || null;
}

/**
 * 取得待同步之標的清單（自動跳過 targetDate 當日已 SUCCESS 者）
 * @param {string[]} symbolsList
 * @param {string} targetDate - YYYY-MM-DD
 * @param {string} [customDbPath]
 * @returns {string[]}
 */
function getPendingUsSymbols(symbolsList, targetDate, customDbPath) {
  if (!Array.isArray(symbolsList) || symbolsList.length === 0) {
    return [];
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const cleanDate = String(targetDate).trim();

  // 查詢當天已成功的標的集合
  const successRows = db
    .prepare("SELECT symbol FROM sync_checkpoints WHERE market = 'US' AND status = 'SUCCESS' AND last_success_date = ?")
    .all(cleanDate);

  const successSet = new Set(successRows.map((r) => r.symbol.toUpperCase()));

  return symbolsList.filter((s) => {
    const sym = String(s).trim().toUpperCase();
    return !successSet.has(sym);
  });
}

module.exports = {
  recordSyncCheckpoint,
  getSyncCheckpointStatus,
  getPendingUsSymbols,
};
