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
});
