/**
 * tag-tw-stock-status.cjs
 * 台股注意股票與處置股票狀態標記管線
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 解析注意與處置股票清冊（處置 DISPOSITION > 注意 ATTENTION）
 * @param {object} rawNoticeData
 * @param {object} rawDispositionData
 * @returns {Record<string, 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'>}
 */
function parseTwAttentionDisposition(rawNoticeData, rawDispositionData) {
  const result = {};

  // 先解析注意股票
  if (rawNoticeData && Array.isArray(rawNoticeData.data)) {
    for (const row of rawNoticeData.data) {
      if (!Array.isArray(row) || !row[0]) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;
      result[symbol] = 'ATTENTION';
    }
  }

  // 再解析處置股票（覆蓋並升級為 DISPOSITION）
  if (rawDispositionData && Array.isArray(rawDispositionData.data)) {
    for (const row of rawDispositionData.data) {
      if (!Array.isArray(row) || !row[0]) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;
      result[symbol] = 'DISPOSITION';
    }
  }

  return result;
}

/**
 * 將最新注意/處置狀態寫入 symbols_meta，未入榜的台股標的重置為 NORMAL
 * @param {Record<string, string>} statusMap
 * @param {string} [customDbPath]
 * @returns {{ updatedCount: number }}
 */
function updateStockStatusInSqlite(statusMap, customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const now = Date.now();

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    // 1. 將所有目前標記為 ATTENTION 或 DISPOSITION 的台股重置為 NORMAL
    db.prepare(`
      UPDATE symbols_meta
      SET status = 'NORMAL', updated_at = ?
      WHERE market = 'TW' AND status IN ('ATTENTION', 'DISPOSITION')
    `).run(now);

    // 2. 將新榜單中的標的標記為對應狀態
    const updateStmt = db.prepare(`
      UPDATE symbols_meta
      SET status = ?, updated_at = ?
      WHERE symbol = ?
    `);

    for (const [symbol, status] of Object.entries(statusMap)) {
      const res = updateStmt.run(status, now, symbol);
      if (res.changes > 0) {
        count++;
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { updatedCount: count };
}

/**
 * 查詢單檔標的的交易狀態
 * @param {string} symbol
 * @param {string} [customDbPath]
 * @returns {'NORMAL' | 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'}
 */
function getStockStatus(symbol, customDbPath) {
  if (!symbol) return 'NORMAL';
  const db = getSqliteDbConnection(customDbPath);
  const row = db
    .prepare('SELECT status FROM symbols_meta WHERE symbol = ?')
    .get(String(symbol).trim().toUpperCase());
  return row?.status || 'NORMAL';
}

module.exports = {
  parseTwAttentionDisposition,
  updateStockStatusInSqlite,
  getStockStatus,
};
