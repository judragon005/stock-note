/**
 * sqlite-db-core.cjs
 * 本地 SQLite 湖倉核心連線層與資料表初始化
 * 基於 Node.js 22+ 原生 node:sqlite 模組，零第三方套件依賴
 */

let DatabaseSync = null;
try {
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch {
  // 環境未支援 node:sqlite (如 Node < 22)
}

const fs = require('fs');
const path = require('path');

// 預設資料庫路徑：.scratch/market-cache/market_history.db
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../.scratch/market-cache/market_history.db');

let globalDbInstance = null;
let currentDbPath = null;

/**
 * 檢查當前執行階段是否支援 node:sqlite
 */
function isSqliteSupported() {
  return typeof DatabaseSync === 'function';
}

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
  if (!isSqliteSupported()) {
    throw new Error('ERR_SQLITE_NOT_SUPPORTED: 當前 Node.js 執行階段不支援 node:sqlite (需 Node 22+)');
  }

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

  // 啟用防鎖定逾時與高效 WAL 模式
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA journal_mode = WAL;');
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
      transactions INTEGER,       -- 官方真實成交筆數 (來源未提供時為 NULL，嚴禁偽造)
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_candles_date ON daily_candles(date);
    CREATE INDEX IF NOT EXISTS idx_candles_symbol_date ON daily_candles(symbol, date DESC);
  `);

  // 2.1 無損遷移：舊版資料庫缺少 transactions 欄位時動態補上 (冪等，Spec 0168)
  const candleColumns = db.prepare('PRAGMA table_info(daily_candles)').all();
  if (!candleColumns.some((c) => c.name === 'transactions')) {
    db.exec('ALTER TABLE daily_candles ADD COLUMN transactions INTEGER;');
  }

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
    CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_lookup ON sync_checkpoints(market, status, last_success_date);

    -- 5. 台灣集保結算所 (TDCC) 每週股權分散與大戶持股比率表 (Spec 0163)
    CREATE TABLE IF NOT EXISTS tw_tdcc_distribution (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,                -- YYYY-MM-DD (通常為每週五結算日)
      total_shareholders INTEGER,        -- 總股東人數
      over_400_ratio REAL,               -- 400 張以上大戶持股比例 (%)
      over_1000_ratio REAL,              -- 1000 張以上大戶持股比例 (%)
      under_10_ratio REAL,               -- 10 張以下散戶持股比例 (%)
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_tdcc_symbol_date ON tw_tdcc_distribution(symbol, date DESC);

    -- 6. 公開資訊觀測站 (MOPS) 全市場月營收與成長表 (Spec 0163)
    CREATE TABLE IF NOT EXISTS tw_monthly_revenue (
      symbol TEXT NOT NULL,
      year_month TEXT NOT NULL,          -- YYYY-MM
      revenue REAL NOT NULL,             -- 當月營收 (千元)
      last_year_revenue REAL,            -- 去年同月營收 (千元)
      yoy_rate REAL,                     -- 年增率 (%)
      mom_rate REAL,                     -- 月增率 (%)
      is_all_time_high INTEGER DEFAULT 0,-- 是否創歷史新高 (1/0)
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, year_month)
    );
    CREATE INDEX IF NOT EXISTS idx_revenue_symbol ON tw_monthly_revenue(symbol, year_month DESC);

    -- 7. 公司除權除息與重大行動預告表 (Spec 0167 / Ticket 10)
    CREATE TABLE IF NOT EXISTS corporate_action_calendar (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,              -- 'TW' | 'US'
      action_type TEXT NOT NULL,         -- 'DIVIDEND' | 'SPLIT' | 'CAPITAL_REDUCTION' | 'EARNINGS'
      ex_date TEXT NOT NULL,             -- 除權息日 (YYYY-MM-DD)
      payment_date TEXT,                 -- 現金股利發放日 (YYYY-MM-DD)
      cash_dividend_per_share REAL,      -- 每股現金股利
      stock_dividend_ratio REAL,         -- 每股配股比例
      split_ratio REAL,                  -- 股票分割比例
      reference_price REAL,              -- 除權息參考價
      announcement_date TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, action_type, ex_date)
    );
    CREATE INDEX IF NOT EXISTS idx_ca_symbol ON corporate_action_calendar(symbol, ex_date);
    CREATE INDEX IF NOT EXISTS idx_ca_ex_date ON corporate_action_calendar(ex_date);

    -- 8. 台股董監事持股質押與申報轉讓明細表 (Spec 0167 / Ticket 13)
    CREATE TABLE IF NOT EXISTS tw_insider_pledge_records (
      symbol TEXT NOT NULL,
      report_date TEXT NOT NULL,         -- 申報年月 (YYYY-MM)
      pledged_shares INTEGER,            -- 質押股數
      total_director_shares INTEGER,     -- 董監總持股數
      pledge_ratio REAL,                 -- 質押比例 (%)
      insider_transfer_shares INTEGER,   -- 當月申報轉讓股數
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, report_date)
    );
    CREATE INDEX IF NOT EXISTS idx_pledge_symbol ON tw_insider_pledge_records(symbol, report_date DESC);

    -- 9. 宏觀指標與市場情緒日序表 (Spec 0167 / Ticket 15)
    CREATE TABLE IF NOT EXISTS macro_sentiment_daily (
      date TEXT PRIMARY KEY,             -- YYYY-MM-DD
      risk_free_rate_3m REAL,            -- 3 個月美債殖利率 (FRED DGS3MO)
      treasury_yield_10y REAL,           -- 10 年美債殖利率 (FRED DGS10)
      yield_spread_10y_2y REAL,          -- 10Y-2Y 利差
      cnn_fear_greed_score REAL,         -- 恐懼貪婪分數 (0-100)
      vix_close REAL,                    -- VIX 收盤價
      tw_put_call_ratio REAL,            -- 台指期 P/C Ratio
      updated_at INTEGER NOT NULL
    );
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
  isSqliteSupported,
  getSqliteDbConnection,
  initSqliteLakehouseDb,
  closeSqliteDb,
};
