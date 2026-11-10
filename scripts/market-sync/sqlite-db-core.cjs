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

    -- 9. 宏觀指標與市場情緒日序表 (Spec 0167 / Spec 0183 / Spec 0221)
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
      treasury_yield_2y REAL,            -- 2 年美債殖利率 (FRED DGS2)
      fed_funds_rate REAL,               -- 聯準會基準利率 (FRED FEDFUNDS)
      us_cpi_yoy REAL,                   -- 美國 CPI 年增率 YoY (%)
      credit_spread_oas REAL,            -- 高收益債利差 (FRED BAMLH0A0HYM2)
      tw_margin_maintenance_ratio REAL,  -- 台股整體融資維持率 (%)
      ig_spread_oas REAL,                -- 投資級債利差 (FRED BAMLC0A0CM)
      ccc_spread_oas REAL,               -- CCC 級高收益債利差 (FRED BAMLH0A3HYC)
      breakeven_10y REAL,                -- 10 年平衡通膨率 (FRED T10YIE)
      initial_claims REAL,               -- 初請失業金人數 (FRED ICSA)
      us_mfg_new_orders_yoy REAL,        -- 美國製造業新訂單年增率 (FRED AMTMNO, Spec 0222)
      us_mfg_inventories_yoy REAL,       -- 美國製造業存貨年增率 (FRED AMTMTI, Spec 0222)
      us_orders_minus_inv_spread REAL,   -- 新訂單減存貨動能差 (Spec 0222)
      us_industrial_prod_yoy REAL,       -- 美國工業生產指數年增率 (FRED INDPRO, Spec 0222)
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
    const existingMacroCols = new Set(macroColumns.map((c) => c.name));
    const newMacroCols = [
      { name: 'tw_foreign_futures_oi', type: 'INTEGER' },
      { name: 'tw_trust_futures_oi', type: 'INTEGER' },
      { name: 'treasury_yield_2y', type: 'REAL' },
      { name: 'fed_funds_rate', type: 'REAL' },
      { name: 'us_cpi_yoy', type: 'REAL' },
      { name: 'credit_spread_oas', type: 'REAL' },
      { name: 'tw_margin_maintenance_ratio', type: 'REAL' },
      { name: 'ig_spread_oas', type: 'REAL' },
      { name: 'ccc_spread_oas', type: 'REAL' },
      { name: 'breakeven_10y', type: 'REAL' },
      { name: 'initial_claims', type: 'REAL' },
      { name: 'us_mfg_new_orders_yoy', type: 'REAL' },
      { name: 'us_mfg_inventories_yoy', type: 'REAL' },
      { name: 'us_orders_minus_inv_spread', type: 'REAL' },
      { name: 'us_industrial_prod_yoy', type: 'REAL' },
    ];
    for (const col of newMacroCols) {
      if (!existingMacroCols.has(col.name)) {
        try {
          db.exec(`ALTER TABLE macro_sentiment_daily ADD COLUMN ${col.name} ${col.type};`);
        } catch {
          // 容錯防重複
        }
      }
    }
  } catch (e) {
    // 忽略表尚未建立時的遷移檢查錯誤
  }

  db.getTwMarketBreadthAndSpotSummary = (options) => getTwMarketBreadthAndSpotSummary(db, options);
  db.getMarketMultiHorizonBreadth = (targetDate) => getMarketMultiHorizonBreadth(targetDate, db);

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
      WHERE i.date = COALESCE(
        (SELECT date FROM tw_institutional_chips GROUP BY date HAVING COUNT(*) >= 1800 ORDER BY date DESC LIMIT 1),
        (SELECT MAX(date) FROM tw_institutional_chips)
      )
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

// 全局交易日定錨記憶體快取 (Spec 0221: 單次呼叫執行時間 < 25ms)
const breadthAnchorCache = new Map();

function clearBreadthAnchorCache() {
  breadthAnchorCache.clear();
}

/**
 * 查詢公開資訊觀測站 (MOPS) 本地 SQLite 最新月營收擴散指數與全市場總營收 YoY (%) (Spec 0222 Ticket 02)
 * 營收月增率擴散指數 = (當月營收 MoM > 0 之上市櫃公司家數 / 總有效家數) * 100
 * 全市場營收年增率 = (全市場當月營收總額 / 去年同月營收總額 - 1) * 100
 * @param {DatabaseSync|string} [dbOrPath] 資料庫連線實例或路徑
 */
function getTwRevenueDiffusionAndYoY(dbOrPath) {
  let db = dbOrPath;
  db =
    db && typeof db === 'object' && typeof db.prepare === 'function'
      ? db
      : getSqliteDbConnection(typeof db === 'string' ? db : undefined);

  try {
    // 取得最新營收年月 (YYYY-MM)，且家數需 >= 500 以確保非殘缺期
    let targetMonth = null;
    const latestMonthRow = db
      .prepare(`
        SELECT year_month, COUNT(*) AS count
        FROM tw_monthly_revenue
        GROUP BY year_month
        HAVING count >= 500
        ORDER BY year_month DESC
        LIMIT 1
      `)
      .get();

    if (latestMonthRow && latestMonthRow.year_month) {
      targetMonth = latestMonthRow.year_month;
    } else {
      // 容錯降級：若無 >= 500 的月份，取最新月份
      const fallbackMonth = db
        .prepare('SELECT year_month FROM tw_monthly_revenue ORDER BY year_month DESC LIMIT 1')
        .get();
      if (!fallbackMonth || !fallbackMonth.year_month) {
        return null;
      }
      targetMonth = fallbackMonth.year_month;
    }

    // 聚合統計：排除營收 <= 0 之無效資料
    const statsRow = db
      .prepare(`
        SELECT
          COUNT(*) AS total_count,
          SUM(CASE WHEN mom_rate > 0 THEN 1 ELSE 0 END) AS mom_positive_count,
          SUM(CASE WHEN yoy_rate > 0 THEN 1 ELSE 0 END) AS yoy_positive_count,
          SUM(revenue) AS total_revenue,
          SUM(last_year_revenue) AS total_last_year_revenue
        FROM tw_monthly_revenue
        WHERE year_month = ?
          AND revenue > 0
          AND (LENGTH(symbol) = 4 AND symbol GLOB '[0-9][0-9][0-9][0-9]')
      `)
      .get(targetMonth);

    if (!statsRow || !statsRow.total_count || statsRow.total_count === 0) {
      return null;
    }

    const totalCount = Number(statsRow.total_count);
    const momPositive = Number(statsRow.mom_positive_count || 0);
    const diffusionIndex = Number(((momPositive / totalCount) * 100).toFixed(1));

    let totalRevenueYoY = 0;
    const curRev = Number(statsRow.total_revenue || 0);
    const lastRev = Number(statsRow.total_last_year_revenue || 0);
    if (lastRev > 0 && curRev > 0) {
      totalRevenueYoY = Number((((curRev - lastRev) / lastRev) * 100).toFixed(2));
    }

    return {
      yearMonth: targetMonth,
      totalCount,
      diffusionIndex,
      isExpansion: diffusionIndex >= 50,
      totalRevenueYoY,
      totalRevenueTwdBillions: Number((curRev / 1e5).toFixed(2)), // 營收單位千元 -> 億元
    };
  } catch {
    return null;
  }
}

/**
 * 計算台美多週期市場寬度 (20MA / 60MA / 200MA 還原除權息) 與台股近 60 日融資去槓桿比率 (Spec 0221 & Spec 0222 Tickets 03, 04)
 * 1. 權證過濾：台股僅包含 4 碼純數字個股與 00 開頭 ETF，嚴格剔除 6 碼認購/認售權證
 * 2. 交易日獨立定錨：台股與美股各自定錨最新交易日與 200 日獨立視窗，避免休市與聯集稀釋
 * 3. 200MA 合格門檻彈性化：採 Math.min(180, availableDates.length)，確保近一年 180~200 天皆能正常統計
 * 4. 融資殘缺日過濾：過濾 COUNT(margin_balance) 異常殘缺日，計算真實融資減幅
 * 5. 大盤 Fallback 與動態指標：^TWII 缺失時自動 fallback 至 0050，計算動態布林通道下軌與利空鈍化
 * @param {string} [targetDate] 目標交易日 (YYYY-MM-DD)
 * @param {DatabaseSync|string} [dbOrPath] 資料庫連線實例或路徑
 */
function getMarketMultiHorizonBreadth(targetDate, dbOrPath) {
  let db = dbOrPath;
  if (!db && typeof targetDate === 'object' && targetDate !== null && typeof targetDate.prepare === 'function') {
    db = targetDate;
    targetDate = undefined;
  }
  db =
    db && typeof db === 'object' && typeof db.prepare === 'function'
      ? db
      : getSqliteDbConnection(typeof db === 'string' ? db : undefined);

  // 定錨全域基準日
  const baseTargetDate = (typeof targetDate === 'string' && targetDate.trim()) ? targetDate.trim() : null;
  const cacheKey = `${currentDbPath || 'default'}:${baseTargetDate || 'latest'}`;
  if (breadthAnchorCache.has(cacheKey)) {
    return breadthAnchorCache.get(cacheKey);
  }

  // 1. 台股獨立定錨與 200 日交易日清單 (僅 4 碼股票與 00 開頭 ETF，排除 6 碼權證)
  const twDateQuery = baseTargetDate
    ? `SELECT DISTINCT date FROM daily_candles
       WHERE date <= ? AND (symbol GLOB '[0-9][0-9][0-9][0-9]' OR symbol LIKE '00%')
       ORDER BY date DESC LIMIT 200`
    : `SELECT DISTINCT date FROM daily_candles
       WHERE (symbol GLOB '[0-9][0-9][0-9][0-9]' OR symbol LIKE '00%')
       ORDER BY date DESC LIMIT 200`;
  const twDateRows = baseTargetDate
    ? db.prepare(twDateQuery).all(baseTargetDate)
    : db.prepare(twDateQuery).all();
  const twDates = twDateRows.map((r) => r.date);
  const twAnchorDate = twDates.length > 0 ? twDates[0] : null;

  // 2. 美股獨立定錨與 200 日交易日清單 (純字母代碼，排除指數 ^)
  const usDateQuery = baseTargetDate
    ? `SELECT DISTINCT date FROM daily_candles
       WHERE date <= ? AND symbol GLOB '[A-Za-z]*' AND symbol NOT LIKE '^%'
       ORDER BY date DESC LIMIT 200`
    : `SELECT DISTINCT date FROM daily_candles
       WHERE symbol GLOB '[A-Za-z]*' AND symbol NOT LIKE '^%'
       ORDER BY date DESC LIMIT 200`;
  const usDateRows = baseTargetDate
    ? db.prepare(usDateQuery).all(baseTargetDate)
    : db.prepare(usDateQuery).all();
  const usDates = usDateRows.map((r) => r.date);
  const usAnchorDate = usDates.length > 0 ? usDates[0] : null;

  // 全域展示日期：以台股最新為優先，若無則美股
  const displayAnchorDate = twAnchorDate || usAnchorDate || new Date().toISOString().slice(0, 10);

  if (twDates.length === 0 && usDates.length === 0) {
    const emptyResult = {
      asOfDate: displayAnchorDate,
      tradeDate: displayAnchorDate,
      breadth20: 0,
      breadth60: 0,
      breadth200: 0,
      pctAbove20MA: 0,
      pctAbove60MA: 0,
      pctAbove200MA: 0,
      totalStocks: 0,
      totalFilteredStocks: 0,
      tw: {
        asOfDate: twAnchorDate,
        breadth20: 0,
        breadth60: 0,
        breadth200: 0,
        totalStocks: 0,
        eligible20Count: 0,
        eligible60Count: 0,
        eligible200Count: 0,
        above20MaCount: 0,
        above60MaCount: 0,
        above200MaCount: 0,
      },
      us: {
        asOfDate: usAnchorDate,
        breadth20: 0,
        breadth60: 0,
        breadth200: 0,
        totalStocks: 0,
        eligible20Count: 0,
        eligible60Count: 0,
        eligible200Count: 0,
        above20MaCount: 0,
        above60MaCount: 0,
        above200MaCount: 0,
      },
      marginDeleveragingRatio: 1,
      twMarginDeleveraging: {
        taiexMaxDrawdown: 0,
        marginReductionPercent: 0,
        marginDeleveragingRatio: 1,
        isCleaned: true,
        isAtBollingerLowerBand: false,
        isBadNewsDivergenceObserved: false,
      },
    };
    breadthAnchorCache.set(cacheKey, emptyResult);
    return emptyResult;
  }

  // 3. 計算台股寬度 (Spec 0222: 門檻調整為 18/55/180 天)
  let twTotal = 0;
  let twEligible20 = 0;
  let twEligible60 = 0;
  let twEligible200 = 0;
  let twAbove20 = 0;
  let twAbove60 = 0;
  let twAbove200 = 0;

  if (twDates.length > 0) {
    const twMinDate = twDates[twDates.length - 1];
    const minTw20 = Math.min(18, twDates.length);
    const minTw60 = Math.min(55, twDates.length);
    const minTw200 = Math.min(180, twDates.length);

    const twRows = db
      .prepare(`
        WITH bounds AS (
          SELECT ? AS min_date, ? AS max_date
        ),
        ranked AS (
          SELECT
            c.symbol,
            c.date,
            COALESCE(NULLIF(c.adj_close, 0), c.close) AS price,
            c.volume,
            ROW_NUMBER() OVER (PARTITION BY c.symbol ORDER BY c.date DESC) AS rn,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS ma20,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 59 FOLLOWING
            ) AS ma60,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 199 FOLLOWING
            ) AS ma200,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS cnt20,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 59 FOLLOWING
            ) AS cnt60,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 199 FOLLOWING
            ) AS cnt200,
            SUM(COALESCE(c.volume, 0)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS sum_vol20
          FROM daily_candles c
          JOIN bounds b ON c.date >= b.min_date AND c.date <= b.max_date
          WHERE (c.symbol GLOB '[0-9][0-9][0-9][0-9]' OR (c.symbol LIKE '00%' AND LENGTH(c.symbol) <= 6))
        )
        SELECT
          symbol, date, price, volume,
          ma20, ma60, ma200,
          cnt20, cnt60, cnt200,
          sum_vol20
        FROM ranked
        WHERE rn = 1 AND date = (SELECT max_date FROM bounds)
      `)
      .all(twMinDate, twAnchorDate);

    for (const r of twRows) {
      // 殭屍股過濾
      if (r.sum_vol20 <= 0 && (r.volume === null || r.volume === undefined || r.volume <= 0)) {
        continue;
      }
      twTotal++;
      const price = r.price;
      if (r.ma20 !== null && r.cnt20 >= minTw20) {
        twEligible20++;
        if (price >= r.ma20) twAbove20++;
      }
      if (r.ma60 !== null && r.cnt60 >= minTw60) {
        twEligible60++;
        if (price >= r.ma60) twAbove60++;
      }
      if (r.ma200 !== null && r.cnt200 >= minTw200) {
        twEligible200++;
        if (price >= r.ma200) twAbove200++;
      }
    }
  }

  // 4. 計算美股寬度
  let usTotal = 0;
  let usEligible20 = 0;
  let usEligible60 = 0;
  let usEligible200 = 0;
  let usAbove20 = 0;
  let usAbove60 = 0;
  let usAbove200 = 0;

  if (usDates.length > 0) {
    const usMinDate = usDates[usDates.length - 1];
    const minUs20 = Math.min(18, usDates.length);
    const minUs60 = Math.min(55, usDates.length);
    const minUs200 = Math.min(180, usDates.length);

    const usRows = db
      .prepare(`
        WITH bounds AS (
          SELECT ? AS min_date, ? AS max_date
        ),
        ranked AS (
          SELECT
            c.symbol,
            c.date,
            COALESCE(NULLIF(c.adj_close, 0), c.close) AS price,
            c.volume,
            ROW_NUMBER() OVER (PARTITION BY c.symbol ORDER BY c.date DESC) AS rn,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS ma20,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 59 FOLLOWING
            ) AS ma60,
            AVG(COALESCE(NULLIF(c.adj_close, 0), c.close)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 199 FOLLOWING
            ) AS ma200,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS cnt20,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 59 FOLLOWING
            ) AS cnt60,
            COUNT(c.close) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 199 FOLLOWING
            ) AS cnt200,
            SUM(COALESCE(c.volume, 0)) OVER (
              PARTITION BY c.symbol ORDER BY c.date DESC ROWS BETWEEN CURRENT ROW AND 19 FOLLOWING
            ) AS sum_vol20
          FROM daily_candles c
          JOIN bounds b ON c.date >= b.min_date AND c.date <= b.max_date
          WHERE c.symbol GLOB '[A-Za-z]*' AND c.symbol NOT LIKE '^%'
        )
        SELECT
          symbol, date, price, volume,
          ma20, ma60, ma200,
          cnt20, cnt60, cnt200,
          sum_vol20
        FROM ranked
        WHERE rn = 1 AND date = (SELECT max_date FROM bounds)
      `)
      .all(usMinDate, usAnchorDate);

    for (const r of usRows) {
      if (r.sum_vol20 <= 0 && (r.volume === null || r.volume === undefined || r.volume <= 0)) {
        continue;
      }
      usTotal++;
      const price = r.price;
      if (r.ma20 !== null && r.cnt20 >= minUs20) {
        usEligible20++;
        if (price >= r.ma20) usAbove20++;
      }
      if (r.ma60 !== null && r.cnt60 >= minUs60) {
        usEligible60++;
        if (price >= r.ma60) usAbove60++;
      }
      if (r.ma200 !== null && r.cnt200 >= minUs200) {
        usEligible200++;
        if (price >= r.ma200) usAbove200++;
      }
    }
  }

  const twBreadth20 = twEligible20 > 0 ? Number(((twAbove20 / twEligible20) * 100).toFixed(1)) : 0;
  const twBreadth60 = twEligible60 > 0 ? Number(((twAbove60 / twEligible60) * 100).toFixed(1)) : 0;
  const twBreadth200 = twEligible200 > 0 ? Number(((twAbove200 / twEligible200) * 100).toFixed(1)) : 0;

  const usBreadth20 = usEligible20 > 0 ? Number(((usAbove20 / usEligible20) * 100).toFixed(1)) : 0;
  const usBreadth60 = usEligible60 > 0 ? Number(((usAbove60 / usEligible60) * 100).toFixed(1)) : 0;
  const usBreadth200 = usEligible200 > 0 ? Number(((usAbove200 / usEligible200) * 100).toFixed(1)) : 0;

  // 5. 台股近 60 日融資去槓桿比率與動態落底指標 (Spec 0222 Ticket 04)
  let taiexMaxDrawdown = 0;
  let marginReductionPercent = 0;
  let marginDeleveragingRatio = 1;
  let isCleaned = true;
  let isAtBollingerLowerBand = false;
  let isBadNewsDivergenceObserved = false;

  try {
    const dates60 = twDates.slice(0, 60);
    if (dates60.length > 0) {
      const minDate60 = dates60[dates60.length - 1];

      // 5.1 查詢大盤指數日 K (優先 ^TWII，查無則 Fallback 至 0050)
      let indexSymbol = '^TWII';
      let indexRows = db
        .prepare(`
          SELECT date, close, high, low
          FROM daily_candles
          WHERE symbol = ? AND date >= ? AND date <= ?
          ORDER BY date ASC
        `)
        .all(indexSymbol, minDate60, twAnchorDate);

      if (indexRows.length === 0) {
        indexSymbol = '0050';
        indexRows = db
          .prepare(`
            SELECT date, close, high, low
            FROM daily_candles
            WHERE symbol = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
          `)
          .all(indexSymbol, minDate60, twAnchorDate);
      }

      if (indexRows.length > 0) {
        let peakIndex = 0;
        for (const row of indexRows) {
          const val = row.high || row.close || 0;
          if (val > peakIndex) peakIndex = val;
        }
        const curIndex = indexRows[indexRows.length - 1].close;
        if (peakIndex > 0 && curIndex > 0) {
          taiexMaxDrawdown = Number((((curIndex - peakIndex) / peakIndex) * 100).toFixed(2));
        }

        // 計算大盤布林通道 (20MA - 2*StdDev)
        if (indexRows.length >= 20) {
          const last20Closes = indexRows.slice(-20).map((r) => r.close);
          const ma20 = last20Closes.reduce((acc, c) => acc + c, 0) / 20;
          const variance = last20Closes.reduce((acc, c) => acc + Math.pow(c - ma20, 2), 0) / 20;
          const stdDev = Math.sqrt(variance);
          const lowerBand = ma20 - 2 * stdDev;

          // 若收盤價小於或接近布林下軌 (<= lowerBand * 1.01)，視為達到布林下軌位階
          if (curIndex <= lowerBand * 1.01) {
            isAtBollingerLowerBand = true;
          }

          // 計算利空鈍化：若近 5 日內之最低點高於近 20 日最低點 (未破底、底底高) 且近 60 日有明顯修正 (< -3%)
          const minClose20 = Math.min(...last20Closes);
          const last5Lows = indexRows.slice(-5).map((r) => r.low || r.close);
          const minLow5 = Math.min(...last5Lows);
          if (minLow5 > minClose20 && taiexMaxDrawdown < -3.0) {
            isBadNewsDivergenceObserved = true;
          }
        }
      }

      // 5.2 全市場融資餘額 (過濾殘缺日：自動依歷史最大檔數之 60% 作為門檻)
      const rawMarginRows = db
        .prepare(`
          SELECT date, SUM(margin_balance) AS total_margin, COUNT(margin_balance) AS cnt
          FROM tw_institutional_chips
          WHERE date >= ? AND date <= ?
          GROUP BY date
          ORDER BY date ASC
        `)
        .all(minDate60, twAnchorDate);

      let marginRows = [];
      if (rawMarginRows.length > 0) {
        let maxCnt = 0;
        for (const r of rawMarginRows) {
          if (r.cnt > maxCnt) maxCnt = r.cnt;
        }
        // 殘缺日過濾門檻：若最大檔數 >= 1000 則門檻為 1000 檔；否則為最大檔數之 60%
        const validThreshold = maxCnt >= 1000 ? 1000 : Math.max(1, Math.ceil(maxCnt * 0.6));
        const filtered = rawMarginRows.filter((r) => r.cnt >= validThreshold);
        marginRows = filtered.length > 0 ? filtered : rawMarginRows;
      }

      if (marginRows.length > 0) {
        let peakMargin = 0;
        for (const m of marginRows) {
          const mVal = Number(m.total_margin || 0);
          if (mVal > peakMargin) peakMargin = mVal;
        }
        const curMargin = Number(marginRows[marginRows.length - 1].total_margin || 0);
        if (peakMargin > 0 && curMargin > 0) {
          marginReductionPercent = Number((((curMargin - peakMargin) / peakMargin) * 100).toFixed(2));
        }
      }

      // 融資減幅 % vs 指數回撤 % (若大盤回撤 < -0.05%，計算比率)
      if (taiexMaxDrawdown < -0.05) {
        marginDeleveragingRatio = Number((marginReductionPercent / taiexMaxDrawdown).toFixed(2));
        isCleaned = marginReductionPercent <= taiexMaxDrawdown;
      } else {
        marginDeleveragingRatio = 1;
        isCleaned = true;
      }
    }
  } catch {
    // 容錯防禦
  }

  // 頂層寬度以台股優先（若台股為 0 且美股有值則採美股）
  const topBreadth20 = twTotal > 0 ? twBreadth20 : usBreadth20;
  const topBreadth60 = twTotal > 0 ? twBreadth60 : usBreadth60;
  const topBreadth200 = twTotal > 0 ? twBreadth200 : usBreadth200;
  const topTotalStocks = twTotal > 0 ? twTotal : usTotal;

  const result = {
    asOfDate: displayAnchorDate,
    tradeDate: displayAnchorDate,
    breadth20: topBreadth20,
    breadth60: topBreadth60,
    breadth200: topBreadth200,
    pctAbove20MA: topBreadth20,
    pctAbove60MA: topBreadth60,
    pctAbove200MA: topBreadth200,
    totalStocks: topTotalStocks,
    totalFilteredStocks: topTotalStocks,
    tw: {
      asOfDate: twAnchorDate,
      breadth20: twBreadth20,
      breadth60: twBreadth60,
      breadth200: twBreadth200,
      totalStocks: twTotal,
      eligible20Count: twEligible20,
      eligible60Count: twEligible60,
      eligible200Count: twEligible200,
      above20MaCount: twAbove20,
      above60MaCount: twAbove60,
      above200MaCount: twAbove200,
    },
    us: {
      asOfDate: usAnchorDate,
      breadth20: usBreadth20,
      breadth60: usBreadth60,
      breadth200: usBreadth200,
      totalStocks: usTotal,
      eligible20Count: usEligible20,
      eligible60Count: usEligible60,
      eligible200Count: usEligible200,
      above20MaCount: usAbove20,
      above60MaCount: usAbove60,
      above200MaCount: usAbove200,
    },
    marginDeleveragingRatio,
    isAtBollingerLowerBand,
    isBadNewsDivergenceObserved,
    twMarginDeleveraging: {
      taiexMaxDrawdown,
      marginReductionPercent,
      marginDeleveragingRatio,
      isCleaned,
      isAtBollingerLowerBand,
      isBadNewsDivergenceObserved,
    },
  };

  breadthAnchorCache.set(cacheKey, result);
  return result;
}

/**
 * 優雅關閉 SQLite 連線
 */
function closeSqliteDb() {
  clearBreadthAnchorCache();
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
  getMarketMultiHorizonBreadth,
  getTwRevenueDiffusionAndYoY,
  clearBreadthAnchorCache,
  closeSqliteDb,
};
