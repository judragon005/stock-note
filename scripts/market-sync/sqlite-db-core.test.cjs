/**
 * sqlite-db-core.test.cjs
 * Issue #472 / Spec 0221 Ticket 01:
 * SQLite 多週期寬度 & 宏觀持久化修復驗證測試
 * 同時相容 Node.js CLI (node scripts/market-sync/sqlite-db-core.test.cjs) 與 Vitest
 */

process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  initSqliteLakehouseDb,
  getSqliteDbConnection,
  closeSqliteDb,
  getMarketMultiHorizonBreadth,
  clearBreadthAnchorCache,
  isSqliteSupported,
} = require('./sqlite-db-core.cjs');

const {
  ingestMacroSentimentToDb,
  fetchFullMacroWarRoomPulse,
} = require('./ingest-macro-sentiment.cjs');

const {
  createMarketApiMiddleware,
} = require('./vite-market-middleware.cjs');

const d = typeof describe !== 'undefined' ? describe : (name, fn) => {
  console.log(`\n--- ${name} ---`);
  fn();
};
const t = typeof it !== 'undefined' ? it : typeof test !== 'undefined' ? test : (name, fn) => {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    console.error(`  ✖ ${name}:`, err.message);
    throw err;
  }
};

const TEST_DB_PATH = path.resolve(__dirname, '../../.scratch/market-cache/test_macro_breadth_spec0221.db');

function cleanupTestDb() {
  closeSqliteDb();
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch {}
  }
}

d('Spec 0221 Ticket 01: SQLite 多週期寬度 & 宏觀持久化修復', () => {
  if (!isSqliteSupported()) {
    console.warn('[SKIP] Node.js 執行階段不支援 node:sqlite，略過 SQLite 測試');
    return;
  }

  t('1. 初始化與無損遷移：macro_sentiment_daily 應包含所有擴充宏觀欄位且具備冪等性', () => {
    cleanupTestDb();
    const db = initSqliteLakehouseDb(TEST_DB_PATH);

    const columns = db.prepare('PRAGMA table_info(macro_sentiment_daily)').all();
    const colNames = new Set(columns.map((c) => c.name));

    const expectedCols = [
      'treasury_yield_2y',
      'fed_funds_rate',
      'us_cpi_yoy',
      'credit_spread_oas',
      'tw_margin_maintenance_ratio',
      'ig_spread_oas',
      'ccc_spread_oas',
      'breakeven_10y',
      'initial_claims',
      'tw_foreign_futures_oi',
      'tw_trust_futures_oi',
    ];

    for (const col of expectedCols) {
      assert.ok(colNames.has(col), `缺少預期欄位: ${col}`);
    }

    // 驗證冪等性：再次執行初始化不應報錯
    assert.doesNotThrow(() => {
      initSqliteLakehouseDb(TEST_DB_PATH);
    });
  });

  t('2. 宏觀指標持久化：ingestMacroSentimentToDb 應確實持久化所有新欄位', () => {
    cleanupTestDb();
    const db = initSqliteLakehouseDb(TEST_DB_PATH);

    const mockMacroData = {
      date: '2026-11-05',
      riskFreeRate3m: 4.25,
      treasuryYield10y: 4.52,
      yieldSpread10y2y: 0.28,
      cnnFearGreedScore: 58.5,
      vixClose: 16.8,
      twPutCallRatio: 105.2,
      twForeignFuturesOi: -32000,
      twTrustFuturesOi: 21000,
      treasuryYield2y: 4.24,
      fedFundsRate: 4.75,
      usCpiYoY: 2.85,
      creditSpreadOas: 3.25,
      twMarginMaintenanceRatio: 168.5,
      igSpreadOas: 1.15,
      cccSpreadOas: 8.45,
      breakeven10y: 2.28,
      initialClaims: 215000,
    };

    const success = ingestMacroSentimentToDb(mockMacroData, TEST_DB_PATH);
    assert.strictEqual(success, true, 'ingestMacroSentimentToDb 應回傳 true');

    const row = db.prepare('SELECT * FROM macro_sentiment_daily WHERE date = ?').get('2026-11-05');
    assert.ok(row, '資料庫中應能查詢到該日期之紀錄');
    assert.strictEqual(row.treasury_yield_2y, 4.24);
    assert.strictEqual(row.fed_funds_rate, 4.75);
    assert.strictEqual(row.us_cpi_yoy, 2.85);
    assert.strictEqual(row.credit_spread_oas, 3.25);
    assert.strictEqual(row.tw_margin_maintenance_ratio, 168.5);
    assert.strictEqual(row.ig_spread_oas, 1.15);
    assert.strictEqual(row.ccc_spread_oas, 8.45);
    assert.strictEqual(row.breakeven_10y, 2.28);
    assert.strictEqual(row.initial_claims, 215000);
    assert.strictEqual(row.tw_foreign_futures_oi, -32000);
  });

  t('3. getMarketMultiHorizonBreadth: 計算 20MA/60MA/200MA 還原寬度、殭屍股過濾與融資去槓桿比率', () => {
    cleanupTestDb();
    const db = initSqliteLakehouseDb(TEST_DB_PATH);

    // 建立 25 個交易日之日 K 資料
    const dates = [];
    const baseDate = new Date('2026-10-01');
    for (let i = 0; i < 25; i++) {
      const d = new Date(baseDate.getTime() + i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }
    const latestDate = dates[dates.length - 1];

    const insertCandle = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    // 標的 1: 2330 (台股, 強勢股: 價格一路走高，高於 20MA)
    // 測試除權息還原：使用 adj_close > close
    for (let i = 0; i < dates.length; i++) {
      const price = 900 + i * 5;
      const adjPrice = price * 1.05; // 還原除權息
      insertCandle.run('2330', dates[i], price - 2, price + 5, price - 3, price, adjPrice, 5000000);
    }

    // 標的 2: 2454 (台股, 弱勢股: 價格一路走低，低於 20MA)
    for (let i = 0; i < dates.length; i++) {
      const price = 1200 - i * 5;
      insertCandle.run('2454', dates[i], price + 2, price + 3, price - 5, price, price, 2000000);
    }

    // 標的 3: 9999 (殭屍股: 近 20 日 volume 為 0，應被過濾不計入分母)
    for (let i = 0; i < dates.length; i++) {
      insertCandle.run('9999', dates[i], 10, 10, 10, 10, 10, 0);
    }

    // 標的 4: AAPL (美股, 強勢股)
    for (let i = 0; i < dates.length; i++) {
      const price = 220 + i * 2;
      insertCandle.run('AAPL', dates[i], price, price + 2, price - 1, price, price, 10000000);
    }

    // 指數: ^TWII (加權指數，測試回撤)
    // 峰值 23000 -> 回落至 22000 (-4.35%)
    for (let i = 0; i < dates.length; i++) {
      const p = i < 15 ? 22000 + i * 100 : 23500 - (i - 15) * 150;
      insertCandle.run('^TWII', dates[i], p, p + 50, p - 50, p, p, 300000000);
    }

    // 台股籌碼融資: tw_institutional_chips
    // 融資峰值 3000 萬 -> 最新 2500 萬 (-16.67%)
    const insertChips = db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, margin_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (let i = 0; i < dates.length; i++) {
      const mBalance = i < 15 ? 20000000 + i * 1000000 : 35000000 - (i - 15) * 1000000;
      insertChips.run('2330', dates[i], 1000, 500, 200, mBalance);
    }
    db.exec('COMMIT;');

    clearBreadthAnchorCache();

    // 執行寬度計算
    const breadth = getMarketMultiHorizonBreadth(latestDate, db);

    assert.ok(breadth, '應成功回傳市場寬度結果物件');
    assert.strictEqual(breadth.asOfDate, latestDate);

    // 殭屍股 9999 應被過濾，台股有效總標的數應為 2 (2330 與 2454)
    assert.strictEqual(breadth.tw.totalStocks, 2, '台股有效總標的數應排除殭屍股後為 2');
    // 2330 高於 20MA，2454 低於 20MA -> 1 / 2 = 50%
    assert.strictEqual(breadth.tw.breadth20, 50, '20MA 寬度應為 50%');
    assert.strictEqual(breadth.tw.above20MaCount, 1);

    // 美股 AAPL 強勢 -> 100%
    assert.strictEqual(breadth.us.totalStocks, 1);
    assert.strictEqual(breadth.us.breadth20, 100);

    // 融資去槓桿比率驗證
    assert.ok(breadth.twMarginDeleveraging, '應包含台股融資去槓桿物件');
    assert.ok(breadth.twMarginDeleveraging.taiexMaxDrawdown < 0, '加權指數應有回撤');
    assert.ok(breadth.twMarginDeleveraging.marginReductionPercent < 0, '融資餘額應有減幅');
    assert.ok(breadth.marginDeleveragingRatio > 0, '去槓桿比率應大於 0');

    // 測試交易日定錨快取性能：第二次呼叫應在 25ms 內完成
    const start = performance.now();
    const cachedBreadth = getMarketMultiHorizonBreadth(latestDate, db);
    const elapsed = performance.now() - start;

    assert.strictEqual(cachedBreadth, breadth, '定錨快取應直接命中物件');
    assert.ok(elapsed < 25, `定錨快取呼叫時間 (${elapsed.toFixed(3)}ms) 應小於 25ms`);
  });

  t('4. Vite Connect 中介層端點 GET /api/market/breadth 整合驗證', async () => {
    cleanupTestDb();
    const db = initSqliteLakehouseDb(TEST_DB_PATH);

    // 插入一筆日 K
    db.exec(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES ('2330', '2026-11-05', 1000, 1020, 990, 1010, 1010, 5000000);
    `);

    const middleware = createMarketApiMiddleware(TEST_DB_PATH);

    const req = {
      url: '/api/market/breadth?date=2026-11-05',
      method: 'GET',
      headers: {},
    };

    let responseCode = null;
    let responseBody = '';
    const res = {
      writeHead: (code, headers) => {
        responseCode = code;
      },
      end: (data) => {
        responseBody = data;
      },
    };

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, '中介層應攔截 /api/market/breadth');
    assert.strictEqual(responseCode, 200, 'HTTP 狀態碼應為 200');

    const json = JSON.parse(responseBody);
    assert.strictEqual(json.status, 'ok');
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.asOfDate, '2026-11-05');
    assert.ok('breadth20' in json);
    assert.ok('marginDeleveragingRatio' in json);

    cleanupTestDb();
  });
});
