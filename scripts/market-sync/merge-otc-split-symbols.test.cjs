/**
 * merge-otc-split-symbols.test.cjs
 * 櫃買標的去 O 事務性遷移單元測試 (Spec 0170 / Ticket 05)
 */
const fs = require('fs');
const path = require('path');
const {
  mergeOtcSplitSymbolsInDb,
  normalizeOtcSymbolString,
} = require('./merge-otc-split-symbols.cjs');
const {
  initSqliteLakehouseDb,
  getSqliteDbConnection,
  closeSqliteDb,
} = require('./sqlite-db-core.cjs');

const d = typeof describe !== 'undefined' ? describe : (name, fn) => fn();
const t = typeof it !== 'undefined' ? it : typeof test !== 'undefined' ? test : (name, fn) => fn();
const exp = typeof expect !== 'undefined' ? expect : (val) => ({
  toBe: (expected) => {
    const assert = require('assert');
    assert.strictEqual(val, expected);
  },
  toBeDefined: () => {
    const assert = require('assert');
    assert.ok(val !== undefined && val !== null);
  },
  toBeGreaterThan: (expected) => {
    const assert = require('assert');
    assert.ok(val > expected);
  },
});

const testDbPath = path.resolve(__dirname, '../../.scratch/market-cache/test_otc_merge.db');

d('scripts/market-sync/merge-otc-split-symbols.test.cjs (Ticket 05)', () => {
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}

  t('1. normalizeOtcSymbolString 應準確剝除 O 尾綴', () => {
    exp(normalizeOtcSymbolString('3293O')).toBe('3293');
    exp(normalizeOtcSymbolString('00679BO')).toBe('00679B');
    exp(normalizeOtcSymbolString('6488O')).toBe('6488');
    exp(normalizeOtcSymbolString('2330')).toBe('2330');
    exp(normalizeOtcSymbolString('BRK-B')).toBe('BRK-B');
  });

  t('2. mergeOtcSplitSymbolsInDb 應事務性合併 daily_candles 與 tw_institutional_chips 且清理孤兒帶 O 代碼', () => {
    const db = initSqliteLakehouseDb(testDbPath);

    // 插入模擬資料：標準代碼 3293 僅有 10/02
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('3293', '2026-10-02', 740, 750, 735, 745, 745, 1000000);

    // 撕裂代碼 3293O 擁有 10/05, 10/06, 10/07
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('3293O', '2026-10-05', 745, 760, 740, 755, 755, 1200000);
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('3293O', '2026-10-07', 750, 765, 745, 760, 760, 1500000);

    // 籌碼資料同理
    db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, ?, ?, ?)
    `).run('3293O', '2026-10-07', 500, 200, -100);

    // 執行遷移
    const report = mergeOtcSplitSymbolsInDb(testDbPath);
    exp(report.migratedCandlesSymbols).toBeGreaterThan(0);
    exp(report.migratedChipsSymbols).toBeGreaterThan(0);

    // 驗證 3293 如今包含 10/02, 10/05, 10/07
    const count3293 = db.prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?').get('3293').cnt;
    exp(count3293).toBe(3);

    const latest3293 = db.prepare('SELECT date, close FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1').get('3293');
    exp(latest3293.date).toBe('2026-10-07');
    exp(latest3293.close).toBe(760);

    // 驗證 3293O 已被完全清除
    const count3293O = db.prepare('SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol = ?').get('3293O').cnt;
    exp(count3293O).toBe(0);

    // 驗證籌碼表
    const chipRow = db.prepare('SELECT foreign_net, trust_net FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('3293', '2026-10-07');
    exp(chipRow).toBeDefined();
    exp(chipRow.foreign_net).toBe(500);

    const chip3293O = db.prepare('SELECT COUNT(*) as cnt FROM tw_institutional_chips WHERE symbol = ?').get('3293O').cnt;
    exp(chip3293O).toBe(0);

    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (e) {}
  });
});
