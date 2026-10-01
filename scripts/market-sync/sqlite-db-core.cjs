/**
 * sqlite-db-core.cjs
 * 本地 SQLite 湖倉核心連線層與資料表初始化
 * 基於 Node.js 22+ 原生 node:sqlite 模組，零第三方套件依賴
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// 預設資料庫路徑：.scratch/market-cache/market_history.db
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../.scratch/market-cache/market_history.db');

let globalDbInstance = null;
let currentDbPath = null;

/**
 * 取得或自訂 SQLite 儲存庫實體路徑
 */
function getDbPath(customPath) {
  return customPath || DEFAULT_DB_PATH;
}

/**
 * 確保目標目錄存在
 */
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 取得 SQLite 資料庫連線（單例管理）
 * @param {string} [customPath]
 * @returns {DatabaseSync}
 */
function getSqliteDbConnection(customPath) {
  const dbPath = getDbPath(customPath);

  if (globalDbInstance && currentDbPath === dbPath) {
    return globalDbInstance;
  }

  // 若已存在不同路徑連線，先安全關閉
  if (globalDbInstance) {
    closeSqliteDb();
  }

  ensureDirectoryExists(dbPath);
  const db = new DatabaseSync(dbPath);

  // 啟用高效 WAL 模式與防鎖定逾時
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA synchronous = NORMAL;');

  globalDbInstance = db;
  currentDbPath = dbPath;
  return db;
}

/**
 * 初始化四大核心資料表與覆蓋索引
 * @param {string} [customPath]
 * @returns {DatabaseSync}
 */
function initSqliteLakehouseDb(customPath) {
  const db = getSqliteDbConnection(customPath);

  // 1. 標的註冊表 (symbols_meta)
  db.exec(`
    CREATE TABLE IF NOT EXISTS symbols_meta (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      market TEXT NOT NULL,       -- 'TW' | 'US'
      exchange TEXT,              -- 'TWSE' | 'TPEX' | 'NYSE' | 'NASDAQ' 等
      type TEXT DEFAULT 'STOCK',  -- 'STOCK' | 'ETF'
      status TEXT DEFAULT 'NORMAL',-- 'NORMAL' | 'ATTENTION' | 'DISPOSITION' | 'FULL_CASH'
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_lookup ON symbols_meta(market, type, status);
  `);

  // 2. 全市場日 K 線表 (daily_candles)
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_candles (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,         -- YYYY-MM-DD
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      adj_close REAL NOT NULL,
      volume REAL NOT NULL,
      turnover REAL,
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_candles_date ON daily_candles(date);
    CREATE INDEX IF NOT EXISTS idx_candles_symbol_date ON daily_candles(symbol, date DESC);
  `);

  // 3. 台股法人籌碼、信用交易與當沖表 (tw_institutional_chips)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tw_institutional_chips (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,         -- YYYY-MM-DD
      foreign_net INTEGER DEFAULT 0,  -- 外資淨買賣 (張)
      trust_net INTEGER DEFAULT 0,    -- 投信淨買賣 (張)
      dealer_net INTEGER DEFAULT 0,   -- 自營商淨買賣 (張)
      margin_balance INTEGER,         -- 融資餘額
      short_balance INTEGER,          -- 融券餘額
      sbl_balance INTEGER,            -- 借券賣出餘額
      day_trade_rate REAL,            -- 當沖比率 (0~100)
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_chips_date ON tw_institutional_chips(date);
  `);

  // 4. 美股與全市場斷點續傳狀態表 (sync_checkpoints)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      market TEXT NOT NULL,
      symbol TEXT NOT NULL,
      last_success_date TEXT NOT NULL,
      last_attempt_at INTEGER NOT NULL,
      status TEXT NOT NULL,           -- 'SUCCESS' | 'FAILED' | 'PENDING'
      error_msg TEXT,
      PRIMARY KEY (market, symbol)
    );
    CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON sync_checkpoints(market, status);
  `);

  return db;
}

/**
 * 優雅關閉 SQLite 連線
 */
function closeSqliteDb() {
  if (globalDbInstance) {
    try {
      globalDbInstance.close();
    } catch (e) {
      // 忽略已關閉連線錯誤
    } finally {
      globalDbInstance = null;
      currentDbPath = null;
    }
  }
}

module.exports = {
  DEFAULT_DB_PATH,
  getDbPath,
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
};
