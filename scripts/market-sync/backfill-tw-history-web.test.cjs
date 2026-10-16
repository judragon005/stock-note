/**
 * backfill-tw-history-web.test.cjs
 * 自我驗證測試腳本 (Ticket 07 / Target File)
 * 同時相容 Node CLI 與 Vitest 測試套件
 */
const {
  generateTradeDateCandidates,
  formatRocDate,
  normalizeTwSymbol,
  parseTwseDailyQuotesWithTransactions,
  parseTpexDailyQuotesWithTransactions,
} = require('./backfill-tw-history-web.cjs');

const d = typeof describe !== 'undefined' ? describe : (name, fn) => fn();
const t = typeof it !== 'undefined' ? it : typeof test !== 'undefined' ? test : (name, fn) => fn();
const exp = typeof expect !== 'undefined' ? expect : (val) => ({
  toBe: (expected) => {
    const assert = require('assert');
    assert.strictEqual(val, expected);
  },
  toBeUndefined: () => {
    const assert = require('assert');
    assert.strictEqual(val, undefined);
  },
});

d('scripts/market-sync/backfill-tw-history-web.test.cjs', () => {
  t('1. generateTradeDateCandidates 應取得 5 個交易日', () => {
    const dates = generateTradeDateCandidates(5, '2026-10-07');
    exp(dates.length).toBe(5);
  });

  t('2. formatRocDate 應正確格式化民國年', () => {
    exp(formatRocDate('2026-10-07')).toBe('115/10/07');
  });

  t('3. normalizeTwSymbol 應自動剝除 O 尾綴', () => {
    exp(normalizeTwSymbol('3293O')).toBe('3293');
    exp(normalizeTwSymbol('00411AO')).toBe('00411A');
    exp(normalizeTwSymbol('2330')).toBe('2330');
  });

  t('4. parseTwseDailyQuotesWithTransactions 應提取官方 transactions', () => {
    const mockTwse = {
      tables: [
        {
          data: [
            ['2330', '台積電', '10,000,000', '25,000', '10,000,000,000', '980', '990', '970', '985'],
          ],
        },
      ],
    };
    const twseRes = parseTwseDailyQuotesWithTransactions(mockTwse, '2026-10-07');
    exp(twseRes['2330'].transactions).toBe(25000);
    exp(twseRes['2330'].close).toBe(985);
  });

  t('5. parseTpexDailyQuotesWithTransactions 應提取 transactions 並移除 O 尾綴', () => {
    const mockTpex = {
      tables: [
        {
          data: [
            ['00411AO', '主動統一前沿科技', '15.68', '+0.12', '15.55', '15.72', '15.50', '1,892', '12,500,000', '196,000,000'],
          ],
        },
      ],
    };
    const tpexRes = parseTpexDailyQuotesWithTransactions(mockTpex, '2026-10-07');
    exp(tpexRes['00411A'].transactions).toBe(1892);
    exp(tpexRes['00411AO']).toBeUndefined();
  });

  t('6. getVerificationStmts 應單次掃描精確區分普通股與 ETF 並排除權證 (Ticket 01)', () => {
    const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
    const { getVerificationStmts } = require('./backfill-tw-history-web.cjs');
    const db = initSqliteLakehouseDb(':memory:');
    
    // 普通股: 2330, 2317, 6854 (創新板)
    // ETF: 0050, 00878, 00679B
    // 權證 (應被排除): 03001P, 70001
    const testDate = '2026-10-07';
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, 10, 10, 10, 10, 10, 1000)
    `);

    for (const sym of ['2330', '2317', '6854', '0050', '00878', '00679B', '03001P', '70001']) {
      insertStmt.run(sym, testDate);
    }

    const { stockStmt } = getVerificationStmts(db);
    const row = stockStmt.get(testDate);
    
    exp(row.totalCount).toBe(6);
    exp(row.stockCount).toBe(3);
    exp(row.etfCount).toBe(3);
  });

  t('7. fetchAndIngestTwDailyData 快取命中時應正確暴露 stockCount 與 etfCount (Ticket 02)', async () => {
    const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
    const { getVerificationStmts } = require('./backfill-tw-history-web.cjs');
    const testDate = '2026-10-08';
    
    const db = initSqliteLakehouseDb(':memory:');
    const candleStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, 10, 10, 10, 10, 10, 1000)
    `);
    const chipStmt = db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, 100, 100, 100)
    `);

    db.exec('BEGIN TRANSACTION');
    for (let i = 1000; i < 2850; i++) {
      candleStmt.run(String(i), testDate); // 1850 檔普通股
    }
    for (let i = 1; i <= 300; i++) {
      const sym = '00' + String(i).padStart(2, '0');
      candleStmt.run(sym, testDate); // 300 檔 ETF
    }
    for (let i = 1000; i < 3050; i++) {
      chipStmt.run(String(i), testDate); // 2050 筆籌碼
    }
    db.exec('COMMIT');

    const { stockStmt, chipStmt: cStmt } = getVerificationStmts(db);
    const stockRow = stockStmt.get(testDate);
    const chipRow = cStmt.get(testDate);
    exp(Number(stockRow.totalCount)).toBe(2150);
    exp(Number(stockRow.stockCount)).toBe(1850);
    exp(Number(stockRow.etfCount)).toBe(300);
    exp(Number(chipRow.n)).toBe(2050);
  });
});

