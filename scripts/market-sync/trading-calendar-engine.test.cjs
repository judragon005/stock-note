/**
 * trading-calendar-engine.test.cjs
 * 台股法定演算法交易日曆單元測試 (Spec 0170 / Ticket 01)
 */
const {
  isTwTradingDay,
  getPreviousTradingDay,
  getNextTradingDay,
  TW_STATUTORY_HOLIDAYS,
} = require('./trading-calendar-engine.cjs');

const d = typeof describe !== 'undefined' ? describe : (name, fn) => fn();
const t = typeof it !== 'undefined' ? it : typeof test !== 'undefined' ? test : (name, fn) => fn();
const exp = typeof expect !== 'undefined' ? expect : (val) => ({
  toBe: (expected) => {
    const assert = require('assert');
    assert.strictEqual(val, expected);
  },
  toBeGreaterThan: (expected) => {
    const assert = require('assert');
    assert.ok(val > expected);
  },
});

d('scripts/market-sync/trading-calendar-engine.test.cjs', () => {
  t('1. 週末應正確判定為非交易日', () => {
    exp(isTwTradingDay('2026-10-10')).toBe(false); // 週六
    exp(isTwTradingDay('2026-10-11')).toBe(false); // 週日
  });

  t('2. 正常工作日應判定為交易日', () => {
    exp(isTwTradingDay('2026-10-07')).toBe(true); // 週三
    exp(isTwTradingDay('2026-10-08')).toBe(true); // 週四
  });

  t('3. 2026 國定假日與春節應正確判定為非交易日', () => {
    exp(isTwTradingDay('2026-01-01')).toBe(false); // 元旦
    exp(isTwTradingDay('2026-01-02')).toBe(false); // 元旦彈性放假
    exp(isTwTradingDay('2026-02-17')).toBe(false); // 春節
    exp(isTwTradingDay('2026-02-27')).toBe(false); // 二二八補假
    exp(isTwTradingDay('2026-04-03')).toBe(false); // 清明兒童連假
    exp(isTwTradingDay('2026-05-01')).toBe(false); // 勞動節
    exp(isTwTradingDay('2026-06-19')).toBe(false); // 端午節
    exp(isTwTradingDay('2026-09-25')).toBe(false); // 中秋節
    exp(isTwTradingDay('2026-10-09')).toBe(false); // 國慶日補假
  });

  t('4. Date 物件與字串輸入均能正確解析', () => {
    const wedDate = new Date('2026-10-07T09:00:00+08:00');
    exp(isTwTradingDay(wedDate)).toBe(true);
    const sunDate = new Date('2026-10-11T09:00:00+08:00');
    exp(isTwTradingDay(sunDate)).toBe(false);
  });

  t('5. getPreviousTradingDay 應正確跨越週末與連假', () => {
    // 2026-10-12 (週一)，往前一個交易日應越過 10/11(日)、10/10(六)、10/09(五國慶補假)，命中 10/08(四)
    exp(getPreviousTradingDay('2026-10-12')).toBe('2026-10-08');
    // 往前 2 個交易日應命中 10/07
    exp(getPreviousTradingDay('2026-10-12', 2)).toBe('2026-10-07');
    // 10/08 往前 1 個交易日為 10/07
    exp(getPreviousTradingDay('2026-10-08')).toBe('2026-10-07');
  });

  t('6. getNextTradingDay 應正確往後推算交易日', () => {
    // 10/08(四) 往後一個交易日應跨過 10/09, 10/10, 10/11 命中 10/12(一)
    exp(getNextTradingDay('2026-10-08')).toBe('2026-10-12');
  });

  t('7. 假日集合覆蓋多年曆史與未來', () => {
    exp(TW_STATUTORY_HOLIDAYS.size).toBeGreaterThan(50);
  });
});
