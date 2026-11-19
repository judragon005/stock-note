/**
 * tag-tw-stock-status.cjs
 * 台股注意股票與處置股票狀態標記管線
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { stripOtcSuffix } = require('./market-sync-core.cjs');

const TWSE_NOTICE_URL = 'https://openapi.twse.com.tw/v1/announcement/notice';
const TWSE_DISPOSITION_URL = 'https://openapi.twse.com.tw/v1/announcement/punish';
const TPEX_NOTICE_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_trading_warning_information';
const TPEX_DISPOSITION_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_disposal_information';

/**
 * 解析 db 實例或路徑字串，統一回傳可用之 SQLite 連線
 * @param {object|string} [dbOrPath]
 * @param {boolean} [ensureInit=true]
 */
function resolveDbConnection(dbOrPath, ensureInit = true) {
  if (dbOrPath && typeof dbOrPath === 'object' && typeof dbOrPath.prepare === 'function') {
    return dbOrPath;
  }
  const dbPath = typeof dbOrPath === 'string' ? dbOrPath : undefined;
  return ensureInit ? initSqliteLakehouseDb(dbPath) : getSqliteDbConnection(dbPath);
}

/**
 * 從多種官方格式（OpenAPI 物件陣列、TWSE RWD tables/data 陣列）抽取合法台股代碼並剝除 O 尾綴
 * @param {any} rawData
 * @returns {string[]}
 */
function extractStatusSymbols(rawData) {
  const symbols = [];
  if (!rawData) return symbols;

  const pushIfValid = (rawCode) => {
    const symbol = stripOtcSuffix(rawCode);
    if (!symbol || symbol.length < 2 || symbol.length > 6 || !/[0-9]/.test(symbol)) return;
    symbols.push(symbol);
  };

  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (Array.isArray(item)) {
        pushIfValid(item[0]);
      } else if (item && typeof item === 'object') {
        pushIfValid(
          item.SecuritiesCompanyCode || item.Code || item['證券代號'] || item['公司代號'] || item.symbol
        );
      }
    }
    return symbols;
  }

  if (typeof rawData === 'object') {
    const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];
    for (const table of tables) {
      const rows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : [];
      if (rows.length === 0) continue;
      const fields = Array.isArray(table?.fields) ? table.fields.map((f) => String(f)) : [];
      const codeIdx = fields.findIndex((f) => f.includes('代號'));
      const resolvedIdx = codeIdx !== -1 ? codeIdx : 0;

      for (const row of rows) {
        if (Array.isArray(row)) {
          pushIfValid(row[resolvedIdx]);
        } else if (row && typeof row === 'object') {
          pushIfValid(
            row.SecuritiesCompanyCode || row.Code || row['證券代號'] || row['公司代號'] || row.symbol
          );
        }
      }
    }
  }

  return symbols;
}

/**
 * 解析注意與處置股票清冊（處置 DISPOSITION > 注意 ATTENTION）
 * 相容舊版 { data: [[symbol, ...]] }、TWSE RWD tables 與 TWSE/TPEx OpenAPI 物件陣列
 * @param {object|Array} rawNoticeData
 * @param {object|Array} rawDispositionData
 * @returns {Record<string, 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'>}
 */
function parseTwAttentionDisposition(rawNoticeData, rawDispositionData) {
  const result = {};

  // 先解析注意股票
  for (const symbol of extractStatusSymbols(rawNoticeData)) {
    result[symbol] = 'ATTENTION';
  }

  // 再解析處置股票（覆蓋並升級為 DISPOSITION）
  for (const symbol of extractStatusSymbols(rawDispositionData)) {
    result[symbol] = 'DISPOSITION';
  }

  return result;
}

/**
 * 將最新注意/處置狀態寫入 symbols_meta，未入榜的台股標的重置為 NORMAL
 * @param {Record<string, string>} statusMap
 * @param {object|string} [dbOrPath]
 * @returns {{ updatedCount: number }}
 */
function updateStockStatusInSqlite(statusMap, dbOrPath) {
  const db = resolveDbConnection(dbOrPath, true);
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

    for (const [rawSymbol, status] of Object.entries(statusMap || {})) {
      const symbol = stripOtcSuffix(rawSymbol);
      if (!symbol) continue;
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
 * @param {object|string} [dbOrPath]
 * @returns {'NORMAL' | 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'}
 */
function getStockStatus(symbol, dbOrPath) {
  if (!symbol) return 'NORMAL';
  const db = resolveDbConnection(dbOrPath, false);
  const row = db
    .prepare('SELECT status FROM symbols_meta WHERE symbol = ?')
    .get(stripOtcSuffix(symbol));
  return row?.status || 'NORMAL';
}

/**
 * 聯網抓取 TWSE 與 TPEx 官方注意/處置股票清冊並寫入 symbols_meta.status（可供生產同步排程直接呼叫）
 * @param {object|string} [dbOrPath]
 * @param {{ fetcher?: Function, logger?: Function, silent?: boolean }} [options]
 * @returns {Promise<{ success: boolean, updatedCount: number, attentionCount: number, dispositionCount: number, totalTagged: number, statusMap: Record<string, string>, errors: string[] }>}
 */
async function fetchAndTagTwStockStatuses(dbOrPath, options = {}) {
  const fetcher = typeof options.fetcher === 'function' ? options.fetcher : fetch;
  const logWarn = (msg) => {
    if (options.silent) return;
    const logger = typeof options.logger === 'function' ? options.logger : console.warn;
    logger(`[tag-tw-stock-status] ${msg}`);
  };

  const sources = [
    { key: 'TWSE_NOTICE', kind: 'NOTICE', url: TWSE_NOTICE_URL },
    { key: 'TWSE_DISPOSITION', kind: 'DISPOSITION', url: TWSE_DISPOSITION_URL },
    { key: 'TPEX_NOTICE', kind: 'NOTICE', url: TPEX_NOTICE_URL },
    { key: 'TPEX_DISPOSITION', kind: 'DISPOSITION', url: TPEX_DISPOSITION_URL },
  ];

  const noticeSymbols = [];
  const dispositionSymbols = [];
  const errors = [];
  let succeededSources = 0;

  for (const src of sources) {
    try {
      const res = await fetcher(src.url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'StockTracker/1.0 (local-sync)',
        },
      });

      if (res && typeof res.ok === 'boolean' && !res.ok) {
        const msg = `${src.key} 抓取失敗: HTTP ${res.status ?? 'UNKNOWN'}`;
        logWarn(msg);
        errors.push(msg);
        continue;
      }

      const payload = res && typeof res.json === 'function' ? await res.json() : res;
      const extracted = extractStatusSymbols(payload);
      if (src.kind === 'NOTICE') {
        noticeSymbols.push(...extracted);
      } else {
        dispositionSymbols.push(...extracted);
      }
      succeededSources++;
    } catch (err) {
      const msg = `${src.key} 抓取異常 (${src.url}): ${err?.message || err}`;
      logWarn(msg);
      errors.push(msg);
    }
  }

  // 全來源失敗保護：不可將既有處置/注意狀態清空重置為 NORMAL
  if (succeededSources === 0) {
    return {
      success: false,
      updatedCount: 0,
      attentionCount: 0,
      dispositionCount: 0,
      totalTagged: 0,
      statusMap: {},
      errors,
    };
  }

  const statusMap = parseTwAttentionDisposition(
    { data: noticeSymbols.map((s) => [s]) },
    { data: dispositionSymbols.map((s) => [s]) }
  );

  const { updatedCount } = updateStockStatusInSqlite(statusMap, dbOrPath);
  const values = Object.values(statusMap);
  const attentionCount = values.filter((v) => v === 'ATTENTION').length;
  const dispositionCount = values.filter((v) => v === 'DISPOSITION').length;

  return {
    success: true,
    updatedCount,
    attentionCount,
    dispositionCount,
    totalTagged: values.length,
    statusMap,
    errors,
  };
}

module.exports = {
  TWSE_NOTICE_URL,
  TWSE_DISPOSITION_URL,
  TPEX_NOTICE_URL,
  TPEX_DISPOSITION_URL,
  extractStatusSymbols,
  parseTwAttentionDisposition,
  updateStockStatusInSqlite,
  getStockStatus,
  fetchAndTagTwStockStatuses,
};
