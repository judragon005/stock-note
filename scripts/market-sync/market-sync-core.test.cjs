/**
 * market-sync-core.test.cjs
 * 全市場行情與籌碼核心解析器單元測試 (Spec 0170 / Ticket 03)
 */
const {
  parseTwseDailyQuotesBulk,
  parseTpexDailyQuotesBulk,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
} = require('./market-sync-core.cjs');

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
});

d('scripts/market-sync/market-sync-core.test.cjs (Ticket 03)', () => {
  t('1. parseTwseDailyQuotesBulk 產出的行情物件必須具備非空 symbol 屬性', () => {
    const mockTwseData = {
      tables: [
        {
          data: [
            ['2330', '台積電', '45,000,000', '30,000', '45,000,000,000', '980', '990', '975', '985'],
            ['0050', '元大台灣50', '10,000,000', '8,000', '1,800,000,000', '180', '182', '179', '181'],
          ],
        },
      ],
    };

    const res = parseTwseDailyQuotesBulk(mockTwseData, '2026-10-07');
    exp(res['2330']).toBeDefined();
    exp(res['2330'].symbol).toBe('2330');
    exp(res['2330'].close).toBe(985);
    exp(res['0050']).toBeDefined();
    exp(res['0050'].symbol).toBe('0050');
    exp(res['0050'].close).toBe(181);
  });

  t('2. parseTpexDailyQuotesBulk 產出的行情物件必須具備非空 symbol 屬性，且去除 O 尾綴', () => {
    const mockTpexData = {
      tables: [
        {
          data: [
            ['3293', '鈊象', '750', '10', '740', '755', '735', '1,500,000'],
            ['00679BO', '元大美債20年', '31.5', '0.2', '31.4', '31.6', '31.3', '50,000,000'],
          ],
        },
      ],
    };

    const res = parseTpexDailyQuotesBulk(mockTpexData, '2026-10-07');
    exp(res['3293']).toBeDefined();
    exp(res['3293'].symbol).toBe('3293');
    exp(res['3293'].close).toBe(750);

    // 00679BO 應自動正規化為 00679B
    exp(res['00679B']).toBeDefined();
    exp(res['00679B'].symbol).toBe('00679B');
    exp(res['00679B'].close).toBe(31.5);
  });
});
