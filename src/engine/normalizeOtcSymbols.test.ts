import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Spec 0168 / Ticket 03: 櫃買代碼標準化遷移與技術債 0043 結案 (normalize-otc-symbols)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_normalize_otc.db');
  let core: any;
  let normalizer: any;

  const cleanup = () => {
    for (const suffix of ['', '-wal', '-shm']) {
      const p = testDbPath + suffix;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  };

  beforeEach(() => {
    core = require('../../scripts/market-sync/sqlite-db-core.cjs');
    normalizer = require('../../scripts/market-sync/normalize-otc-symbols.cjs');
    core.closeSqliteDb();
    cleanup();
  });

  afterEach(() => {
    core.closeSqliteDb();
    cleanup();
  });

  it('1. 應能準確將 daily_candles 中結尾帶 O 的櫃買股票與 ETF 遷移歸併為正規代碼 (如 00411AO -> 00411A, 3293O -> 3293)', () => {
    if (!core.isSqliteSupported()) return;
    const db = core.initSqliteLakehouseDb(testDbPath);

    // 模擬舊版包含帶 O 尾綴的歷史資料
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('00411AO', '2026-10-02', 10.79, 10.79, 10.68, 10.71, 10.71, 9935014, null, 1500);

    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('3293O', '2026-10-02', 1000, 1010, 995, 1005, 1005, 500000, null, 800);

    // 模擬美股標的 (結尾帶 O，例如 AEO, ACCO，絕對不能被誤傷遷移！)
    db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover, transactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('AEO', '2026-10-02', 20, 21, 19.5, 20.5, 20.5, 300000, null, null);

    // 執行標準化遷移
    const result = normalizer.runOtcSymbolNormalization(testDbPath);
    expect(result.migratedCandles).toBe(2);

    // 驗證 00411AO 已遷移至 00411A
    const row00411A = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').get('00411A');
    expect(row00411A).toBeTruthy();
    expect(row00411A.close).toBe(10.71);
    expect(row00411A.transactions).toBe(1500);

    const row00411AO = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').get('00411AO');
    expect(row00411AO).toBeUndefined();

    // 驗證 3293O 已遷移至 3293
    const row3293 = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').get('3293');
    expect(row3293).toBeTruthy();
    expect(row3293.close).toBe(1005);

    // 驗證美股 AEO 完好如初，未被破壞
    const rowAeo = db.prepare('SELECT * FROM daily_candles WHERE symbol = ?').get('AEO');
    expect(rowAeo).toBeTruthy();
    expect(rowAeo.close).toBe(20.5);
  });

  it('2. 應能同步遷移 tw_institutional_chips 與 symbols_meta 中帶 O 標的', () => {
    if (!core.isSqliteSupported()) return;
    const db = core.initSqliteLakehouseDb(testDbPath);

    db.prepare(`
      INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
      VALUES (?, ?, ?, ?, ?)
    `).run('00679BO', '2026-10-02', 500, 200, 50);

    db.prepare(`
      INSERT INTO symbols_meta (symbol, name, market, exchange, type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('00679BO', '元大美債20年', 'TW', 'TPEX', 'ETF', Date.now());

    const result = normalizer.runOtcSymbolNormalization(testDbPath);
    expect(result.migratedChips).toBe(1);
    expect(result.migratedSymbols).toBe(1);

    const chipRow = db.prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ?').get('00679B');
    expect(chipRow).toBeTruthy();
    expect(chipRow.foreign_net).toBe(500);

    const metaRow = db.prepare('SELECT * FROM symbols_meta WHERE symbol = ?').get('00679B');
    expect(metaRow).toBeTruthy();
    expect(metaRow.name).toBe('元大美債20年');
  });

  it('3. 冪等性驗證：重複執行遷移不得重複拋錯且結果維持乾淨', () => {
    if (!core.isSqliteSupported()) return;
    core.initSqliteLakehouseDb(testDbPath);
    const firstRun = normalizer.runOtcSymbolNormalization(testDbPath);
    expect(firstRun.migratedCandles).toBe(0);

    const secondRun = normalizer.runOtcSymbolNormalization(testDbPath);
    expect(secondRun.migratedCandles).toBe(0);
  });
});
