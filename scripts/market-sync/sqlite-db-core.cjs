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

  // 啟用防鎖定逾時與高效 WAL 模式 (Spec 0188: 提升至 15000ms 避免鎖衝突)
  db.exec('PRAGMA busy_timeout = 15000;');
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
      industry TEXT,              -- 官方產業別代碼 (例如 '24' 半導體, Spec 0203)
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_lookup ON symbols_meta(market, type, status);
  `);

  // 1.1 無損遷移：舊版資料庫缺少 industry 欄位時動態補上 (冪等，Spec 0203)
  const symbolColumns = db.prepare('PRAGMA table_info(symbols_meta)').all();
  if (!symbolColumns.some((c) => c.name === 'industry')) {
    db.exec('ALTER TABLE symbols_meta ADD COLUMN industry TEXT;');
  }

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
      foreign_net INTEGER DEFAULT 0,  -- 外資淨買賣 (張/股)
      trust_net INTEGER DEFAULT 0,    -- 投信淨買賣 (張/股)
      dealer_net INTEGER DEFAULT 0,   -- 自營商淨買賣 (張/股)
      margin_balance INTEGER,         -- 融資餘額
      short_balance INTEGER,          -- 融券餘額
      sbl_balance INTEGER,            -- 借券賣出餘額
      day_trade_rate REAL,            -- 當沖比率 (0~100)
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_chips_date ON tw_institutional_chips(date);
    CREATE INDEX IF NOT EXISTS idx_chips_symbol_date ON tw_institutional_chips(symbol, date DESC);
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

    -- 7. 公司除權除息與重大行動預告表 (Spec 0167 / Spec 0183)
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
      mandatory_buyback_date TEXT,       -- 融券最後強制回補日 (YYYY-MM-DD, Spec 0183)
      halt_start_date TEXT,              -- 停止過戶/交易起日 (YYYY-MM-DD, Spec 0183)
      halt_end_date TEXT,                -- 停止過戶/交易迄日 (YYYY-MM-DD, Spec 0183)
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

    -- 9. 宏觀指標與市場情緒日序表 (Spec 0167 / Spec 0183)
    CREATE TABLE IF NOT EXISTS macro_sentiment_daily (
      date TEXT PRIMARY KEY,             -- YYYY-MM-DD
      risk_free_rate_3m REAL,            -- 3 個月美債殖利率 (FRED DGS3MO)
      treasury_yield_10y REAL,           -- 10 年美債殖利率 (FRED DGS10)
      yield_spread_10y_2y REAL,          -- 10Y-2Y 利差
      cnn_fear_greed_score REAL,         -- 恐懼貪婪分數 (0-100)
      vix_close REAL,                    -- VIX 收盤價
      tw_put_call_ratio REAL,            -- 台指期 P/C Ratio
      tw_foreign_futures_oi INTEGER,     -- 外資台指期淨未平倉口數 (Spec 0183)
      tw_trust_futures_oi INTEGER,       -- 投信台指期淨未平倉口數 (Spec 0183)
      updated_at INTEGER NOT NULL
    );

    -- 10. ETF 每日收盤官方淨值與折溢價歷史表 (Spec 0183)
    CREATE TABLE IF NOT EXISTS etf_daily_nav (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,                  -- YYYY-MM-DD
      close_price REAL NOT NULL,           -- 當日市價收盤
      nav REAL NOT NULL,                   -- 官方淨值
      premium_discount_ratio REAL NOT NULL,-- 折溢價率 (%)
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_etf_nav_symbol_date ON etf_daily_nav(symbol, date DESC);

    -- 11. 台股每日官方估值表 (PE/PB/殖利率 - Spec 0196)
    CREATE TABLE IF NOT EXISTS tw_valuation_daily (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,                  -- YYYY-MM-DD
      pe REAL,                             -- 官方本益比 (Price-to-Earnings)
      pb REAL,                             -- 官方淨值比 (Price-to-Book)
      dividend_yield REAL,                 -- 官方殖利率 (%) (Dividend Yield)
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, date)
    );
    CREATE INDEX IF NOT EXISTS idx_valuation_symbol_date ON tw_valuation_daily(symbol, date DESC);

    -- 12. 財務三表核心科目表 (Spec 0203 Ticket 08)
    CREATE TABLE IF NOT EXISTS financial_statements_quarterly (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,              -- 'TW' | 'US'
      year INTEGER NOT NULL,
      quarter INTEGER NOT NULL,          -- 1 | 2 | 3 | 4
      revenue REAL,                      -- 營業收入
      gross_profit REAL,                 -- 營業毛利
      operating_income REAL,             -- 營業利益
      net_income REAL,                   -- 母公司業主淨利 (最高優先級)
      eps REAL,                          -- 每股盈餘
      total_assets REAL,                 -- 資產總額
      total_liabilities REAL,            -- 負債總額
      total_equity REAL,                 -- 權益總額
      current_assets REAL,               -- 流動資產
      current_liabilities REAL,          -- 流動負債
      accounts_receivable REAL,          -- 應收帳款與票據
      inventory REAL,                    -- 存貨
      operating_cash_flow REAL,          -- 營業活動現金流 (CFO)
      capital_expenditure REAL,          -- 資本支出 (CapEx)
      free_cash_flow REAL,               -- 自由現金流 (FCF)
      cash_dividends_paid REAL,          -- 現金股利發放
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (symbol, year, quarter)
    );
    CREATE INDEX IF NOT EXISTS idx_fsq_symbol ON financial_statements_quarterly(symbol, year DESC, quarter DESC);
  `);

  // 動態無損補齊既有資料庫之新欄位 (冪等遷移)
  try {
    const caColumns = db.prepare('PRAGMA table_info(corporate_action_calendar)').all();
    if (!caColumns.some((c) => c.name === 'mandatory_buyback_date')) {
      db.exec('ALTER TABLE corporate_action_calendar ADD COLUMN mandatory_buyback_date TEXT;');
    }
    if (!caColumns.some((c) => c.name === 'halt_start_date')) {
      db.exec('ALTER TABLE corporate_action_calendar ADD COLUMN halt_start_date TEXT;');
    }
    if (!caColumns.some((c) => c.name === 'halt_end_date')) {
      db.exec('ALTER TABLE corporate_action_calendar ADD COLUMN halt_end_date TEXT;');
    }

    const macroColumns = db.prepare('PRAGMA table_info(macro_sentiment_daily)').all();
    if (!macroColumns.some((c) => c.name === 'tw_foreign_futures_oi')) {
      db.exec('ALTER TABLE macro_sentiment_daily ADD COLUMN tw_foreign_futures_oi INTEGER;');
    }
    if (!macroColumns.some((c) => c.name === 'tw_trust_futures_oi')) {
      db.exec('ALTER TABLE macro_sentiment_daily ADD COLUMN tw_trust_futures_oi INTEGER;');
    }
  } catch (e) {
    // 忽略表尚未建立時的遷移檢查錯誤
  }

  db.getTwMarketBreadthAndSpotSummary = (options) => getTwMarketBreadthAndSpotSummary(db, options);

  return db;
}

/**
 * 計算台股全市場漲跌家數騰落廣度 (Market Breadth) 與三大法人現貨買賣超預估 (Spec 0209 Ticket 05)
 * 透過近 25 個交易日單一視窗函數查詢，確保執行耗時 < 50ms
 * @param {DatabaseSync|string} [dbOrPath]
 * @param {{ taiexChangePercent?: number }} [options]
 */
function getTwMarketBreadthAndSpotSummary(dbOrPath, options = {}) {
  const db =
    dbOrPath && typeof dbOrPath === 'object' && typeof dbOrPath.prepare === 'function'
      ? dbOrPath
      : initSqliteLakehouseDb(typeof dbOrPath === 'string' ? dbOrPath : undefined);

  const breadthRows = db
    .prepare(`
      WITH recent_dates AS (
        SELECT DISTINCT date
        FROM daily_candles
        WHERE symbol NOT LIKE '^%'
          AND (symbol GLOB '[0-9]*' OR symbol LIKE '%.TW' OR symbol LIKE '%.TWO')
        ORDER BY date DESC
        LIMIT 25
      ),
      bounds AS (
        SELECT MIN(date) AS min_date, MAX(date) AS max_date FROM recent_dates
      ),
      ranked AS (
        SELECT
          c.symbol,
          c.date,
          c.open,
          c.close,
          ROW_NUMBER() OVER (PARTITION BY c.symbol ORDER BY c.date DESC) AS rn,
          LEAD(c.close) OVER (PARTITION BY c.symbol ORDER BY c.date DESC) AS prev_close,
          AVG(c.close) OVER (
            PARTITION BY c.symbol
            ORDER BY c.date DESC
            ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
          ) AS ma20
        FROM daily_candles c
        JOIN bounds b ON c.date >= b.min_date
        WHERE c.symbol NOT LIKE '^%'
          AND (c.symbol GLOB '[0-9]*' OR c.symbol LIKE '%.TW' OR c.symbol LIKE '%.TWO')
      )
      SELECT symbol, date, open, close, prev_close, ma20
      FROM ranked
      WHERE rn = 1 AND date = (SELECT max_date FROM bounds)
    `)
    .all();

  let advancingCount = 0;
  let decliningCount = 0;
  let unchangedCount = 0;
  let above20MaCount = 0;
  let latestTradeDate = null;
  let tsmcChangePositive = null;

  for (const r of breadthRows) {
    if (!latestTradeDate && r.date) latestTradeDate = r.date;
    const refPrice = r.prev_close !== null && r.prev_close !== undefined ? r.prev_close : r.open;
    const diff = r.close - refPrice;

    if (diff > 0) advancingCount++;
    else if (diff < 0) decliningCount++;
    else unchangedCount++;

    if (r.ma20 !== null && r.ma20 !== undefined && r.close >= r.ma20) {
      above20MaCount++;
    }

    if (r.symbol === '2330' || r.symbol === '2330.TW') {
      tsmcChangePositive = diff >= 0;
    }
  }

  // 檢查加權指數 ^TWII 漲跌方向 (供拉積盤 NARROW_TSMC_TRAP 判斷)
  let taiexNonNegative = false;
  if (typeof options.taiexChangePercent === 'number' && !isNaN(options.taiexChangePercent)) {
    taiexNonNegative = options.taiexChangePercent >= 0;
  } else {
    const twiiRows = db
      .prepare('SELECT open, close FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 2')
      .all('^TWII');
    if (twiiRows.length >= 2) {
      taiexNonNegative = twiiRows[0].close >= twiiRows[1].close;
    } else if (twiiRows.length === 1) {
      taiexNonNegative = twiiRows[0].close >= twiiRows[0].open;
    } else if (tsmcChangePositive !== null) {
      taiexNonNegative = tsmcChangePositive;
    }
  }

  const totalStocks = breadthRows.length;
  const pctAbove20Ma = totalStocks > 0 ? Number(((above20MaCount / totalStocks) * 100).toFixed(1)) : 0;
  const advanceDeclineRatio =
    decliningCount > 0
      ? Number((advancingCount / decliningCount).toFixed(2))
      : advancingCount > 0
        ? advancingCount
        : 1;

  let breadthRegime = 'NEUTRAL';
  if (decliningCount > advancingCount * 1.3) {
    breadthRegime = taiexNonNegative ? 'NARROW_TSMC_TRAP' : 'BROAD_DECLINE';
  } else if (advancingCount > decliningCount * 1.3) {
    breadthRegime = 'BROAD_RALLY';
  }

  // 查詢最新交易日三大法人現貨買賣超估計值 (單位：億台幣)
  const chipSummaryRow = db
    .prepare(`
      SELECT
        i.date AS trade_date,
        SUM(COALESCE(i.foreign_net, 0) * COALESCE(c.close, 100)) / 1e8 AS foreign_net_twd_billions,
        SUM(COALESCE(i.trust_net, 0) * COALESCE(c.close, 100)) / 1e8 AS trust_net_twd_billions,
        SUM(COALESCE(i.dealer_net, 0) * COALESCE(c.close, 100)) / 1e8 AS dealer_net_twd_billions
      FROM tw_institutional_chips i
      LEFT JOIN daily_candles c
        ON c.symbol = i.symbol AND c.date = i.date
      WHERE i.date = (SELECT MAX(date) FROM tw_institutional_chips)
      GROUP BY i.date
    `)
    .get();

  const foreignNetTwdBillions = Number((chipSummaryRow?.foreign_net_twd_billions || 0).toFixed(2));
  const trustNetTwdBillions = Number((chipSummaryRow?.trust_net_twd_billions || 0).toFixed(2));
  const dealerNetTwdBillions = Number((chipSummaryRow?.dealer_net_twd_billions || 0).toFixed(2));
  const totalNetTwdBillions = Number(
    (foreignNetTwdBillions + trustNetTwdBillions + dealerNetTwdBillions).toFixed(2)
  );

  return {
    twMarketBreadth: {
      asOfDate: latestTradeDate,
      tradeDate: latestTradeDate,
      advancingCount,
      decliningCount,
      unchangedCount,
      totalStocks,
      advanceDeclineRatio,
      pctAbove20MA: pctAbove20Ma,
      breadthRegime,
    },
    twInstitutionalSpot: {
      asOfDate: chipSummaryRow?.trade_date || latestTradeDate,
      foreignNetTwdBillions,
      trustNetTwdBillions,
      dealerNetTwdBillions,
      totalNetTwdBillions,
    },
  };
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
  getTwMarketBreadthAndSpotSummary,
  closeSqliteDb,
};
