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

  t('8. Ticket 02: 應正確識別修法節日、天災停市日與中文原因 (getHolidayReason)', () => {
    const { getHolidayReason, isTradingDay } = require('./trading-calendar-engine.cjs');
    exp(isTradingDay('2026-09-28', 'TW')).toBe(false);
    exp(getHolidayReason('2026-09-28', 'TW')).toBe('教師節');

    exp(isTradingDay('2026-07-10', 'TW')).toBe(false);
    exp(getHolidayReason('2026-07-10', 'TW')).toBe('巴威颱風停市');

    exp(isTradingDay('2025-12-25', 'TW')).toBe(false);
    exp(getHolidayReason('2025-12-25', 'TW')).toBe('行憲紀念日');

    exp(isTradingDay('2025-10-24', 'TW')).toBe(false);
    exp(getHolidayReason('2025-10-24', 'TW')).toBe('光復節補假');

    // 正常營業日應回傳 null
    exp(isTradingDay('2026-10-07', 'TW')).toBe(true);
    exp(getHolidayReason('2026-10-07', 'TW')).toBe(null);

    // 週末休市原因
    exp(getHolidayReason('2026-10-10', 'TW')).toBe('週末休市');
  });

  t('9. Ticket 02: 支援美股市場休市與原因查詢', () => {
    const { getHolidayReason, isTradingDay } = require('./trading-calendar-engine.cjs');
    exp(isTradingDay('2026-06-19', 'US')).toBe(false);
    exp(getHolidayReason('2026-06-19', 'US')).toBe('六月節 (Juneteenth)');

    exp(isTradingDay('2026-11-26', 'US')).toBe(false);
    exp(getHolidayReason('2026-11-26', 'US')).toBe('感恩節 (Thanksgiving Day)');
  });

  t('10. Ticket 03: 台美交割結算日分流演算法 (getSettlementDate)', () => {
    const { getSettlementDate } = require('./trading-calendar-engine.cjs');
    // 台股 T+2 常規：週二 (2026-10-06) 買進 -> 週四 (2026-10-08) 交割
    exp(getSettlementDate('2026-10-06', 'TW')).toBe('2026-10-08');

    // 台股 T+2 跨週末與連假：週四 (2026-10-08) 買進
    // 10/09(五國慶補假)、10/10(六)、10/11(日)，T+1=10/12(一)，T+2=10/13(二)
    exp(getSettlementDate('2026-10-08', 'TW')).toBe('2026-10-13');

    // 台股遇颱風停市：2026-07-08(三) 買進，原為 07-10(五) 交割，但因巴威颱風停市，自動順延至次營業日 07-13(一)
    exp(getSettlementDate('2026-07-08', 'TW')).toBe('2026-07-13');

    // 美股 T+1 常規：週二 (2026-10-06) 買進 -> 週三 (2026-10-07) 交割
    exp(getSettlementDate('2026-10-06', 'US')).toBe('2026-10-07');

    // 美股 T+1 跨週末：週五 (2026-10-09) 買進 -> 週一 (2026-10-12) 交割
    exp(getSettlementDate('2026-10-09', 'US')).toBe('2026-10-12');
  });

  t('11. Ticket 04: 跨長假融資計息日曆天計算 (getHoldingInterestDays) 與利息金額精算', () => {
    const {
      getHoldingInterestDays,
      DEFAULT_MARGIN_ANNUAL_INTEREST_RATE,
      calculateMarginInterest,
    } = require('./trading-calendar-engine.cjs');
    // 常態週末跨 3 天 (週五 10/09 至 週一 10/12)
    exp(getHoldingInterestDays('2026-10-09', '2026-10-12')).toBe(3);

    // 隔天跨 1 天 (週二 10/06 至 週三 10/07)
    exp(getHoldingInterestDays('2026-10-06', '2026-10-07')).toBe(1);

    // 2026 春節長假：2026-02-11 (封關最後交易日) 至 2026-02-23 (開紅盤首日)，橫跨 12 個日曆天
    exp(getHoldingInterestDays('2026-02-11', '2026-02-23')).toBe(12);

    // 驗證融資年利率預設基準為 6.45%
    exp(DEFAULT_MARGIN_ANNUAL_INTEREST_RATE).toBe(0.0645);

    // 驗證融資利息精算：借款 1,000,000 元，借 12 天，年利率 6.45%
    // 1,000,000 * 0.0645 * (12 / 365) = 2120.5479... -> Math.floor = 2120 元
    exp(calculateMarginInterest(1000000, 12)).toBe(2120);

    // 借款 0 元或 0 天應為 0 元
    exp(calculateMarginInterest(0, 12)).toBe(0);
    exp(calculateMarginInterest(1000000, 0)).toBe(0);
  });

  t('12. Ticket 05: 台美衍生品期指結算日與四巫日感知 (isDerivativesExpiryDay)', () => {
    const { isDerivativesExpiryDay } = require('./trading-calendar-engine.cjs');
    // 2026-10-21 (週三) 為 2026 年 10 月第 3 個週三 -> 台指期結算日
    const twRes = isDerivativesExpiryDay('2026-10-21', 'TW');
    exp(twRes.isExpiry).toBe(true);
    exp(twRes.type).toBe('TXF_MONTHLY');

    // 2026-10-14 (週三) 為第 2 個週三 -> 非結算日
    exp(isDerivativesExpiryDay('2026-10-14', 'TW').isExpiry).toBe(false);

    // 2026-09-18 (週五) 為 9 月第 3 個週五 -> 美股四巫日 (3, 6, 9, 12月)
    const usWitching = isDerivativesExpiryDay('2026-09-18', 'US');
    exp(usWitching.isExpiry).toBe(true);
    exp(usWitching.isQuadrupleWitching).toBe(true);
    exp(usWitching.type).toBe('QUADRUPLE_WITCHING');

    // 2026-10-16 (週五) 為 10 月第 3 個週五 -> 美股常規月選擇權結算
    const usRegular = isDerivativesExpiryDay('2026-10-16', 'US');
    exp(usRegular.isExpiry).toBe(true);
    exp(usRegular.isQuadrupleWitching).toBe(false);
    exp(usRegular.type).toBe('US_MONTHLY_OPTIONS');
  });

  t('13. Ticket 07: 集保 TDCC 逢連假自動前推演算法 (getLatestTdccPublishDate)', () => {
    const { getLatestTdccPublishDate } = require('./trading-calendar-engine.cjs');
    // 常規週五：2026-10-16 (週五) 21:30 執行 -> 基準日應為當日 2026-10-16
    const normalFriNight = new Date('2026-10-16T21:30:00+08:00');
    exp(getLatestTdccPublishDate(normalFriNight)).toBe('2026-10-16');

    // 連假週五：2026-04-03 (清明連假週五休市)，集保提前至該週最後營業日 2026-04-02 (週四) 發布
    const holidayFriNight = new Date('2026-04-03T21:30:00+08:00');
    exp(getLatestTdccPublishDate(holidayFriNight)).toBe('2026-04-02');

    // 颱風假週五：2026-07-10 (巴威颱風停市)，集保提前至 2026-07-09 (週四)
    const typhoonFriNight = new Date('2026-07-10T21:30:00+08:00');
    exp(getLatestTdccPublishDate(typhoonFriNight)).toBe('2026-07-09');
  });

  t('14. Ticket 08: 上市櫃公司月營收 10 號遇假自動順延 (getRevenueDeadlineDate)', () => {
    const { getRevenueDeadlineDate } = require('./trading-calendar-engine.cjs');
    // 常態工作日：2026 年 9 月營收，次月 10 號為 2026-10-10 (週六) -> 10/11(日)，順延至 2026-10-12 (週一)
    exp(getRevenueDeadlineDate(2026, 9)).toBe('2026-10-12');

    // 2026 年 4 月營收，次月 10 號為 2026-05-10 (週日) -> 順延至 2026-05-11 (週一)
    exp(getRevenueDeadlineDate(2026, 4)).toBe('2026-05-11');

    // 2026 年 6 月營收，次月 10 號為 2026-07-10 (巴威颱風停市週五) -> 順延至 2026-07-13 (週一)
    exp(getRevenueDeadlineDate(2026, 6)).toBe('2026-07-13');

    // 常態非假：2026 年 2 月營收，次月 10 號為 2026-03-10 (週二正常營業日) -> 2026-03-10
    exp(getRevenueDeadlineDate(2026, 2)).toBe('2026-03-10');
  });
});






