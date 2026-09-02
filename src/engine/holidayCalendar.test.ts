import { describe, it, expect } from 'vitest';
import {
  isMarketHoliday,
  isBusinessDay,
  getNextBusinessDay,
  TW_MARKET_HOLIDAYS,
  US_MARKET_HOLIDAYS,
} from './holidayCalendar';

describe('法定國定假日休市日曆與營業日引擎 (Holiday & Business Day Engine)', () => {
  describe('常數與資料結構驗證', () => {
    it('應正確載入台美雙市場休市日曆 ReadonlySet 且大小合理', () => {
      expect(TW_MARKET_HOLIDAYS).toBeInstanceOf(Set);
      expect(US_MARKET_HOLIDAYS).toBeInstanceOf(Set);
      expect(TW_MARKET_HOLIDAYS.size).toBeGreaterThan(50);
      expect(US_MARKET_HOLIDAYS.size).toBeGreaterThan(50);
    });
  });

  describe('台股休市日與營業日判斷 (isMarketHoliday & isBusinessDay - TW)', () => {
    it('應能精確識別台股國定假日（非週末之休市日）', () => {
      // 2026 年元旦
      expect(isMarketHoliday('2026-01-01', 'TW')).toBe(true);
      expect(isBusinessDay('2026-01-01', 'TW')).toBe(false);

      // 2026 年勞動節 (週五)
      expect(isMarketHoliday('2026-05-01', 'TW')).toBe(true);
      expect(isBusinessDay('2026-05-01', 'TW')).toBe(false);

      // 2026 年國慶日補假 (2026-10-09 週五)
      expect(isMarketHoliday('2026-10-09', 'TW')).toBe(true);
      expect(isBusinessDay('2026-10-09', 'TW')).toBe(false);
    });

    it('應能精確識別台股農曆春節封關期間連續休市', () => {
      // 2026 年春節連續休市 (2026-02-12 ~ 2026-02-20)
      const cnyDays = [
        '2026-02-12', // 週四
        '2026-02-13', // 週五
        '2026-02-16', // 週一 (初一)
        '2026-02-17', // 週二 (初二)
        '2026-02-18', // 週三 (初三)
        '2026-02-19', // 週四 (初四)
        '2026-02-20', // 週五 (初五)
      ];

      for (const day of cnyDays) {
        expect(isMarketHoliday(day, 'TW')).toBe(true);
        expect(isBusinessDay(day, 'TW')).toBe(false);
      }

      // 2026-02-23 (週一開紅盤營業日)
      expect(isMarketHoliday('2026-02-23', 'TW')).toBe(false);
      expect(isBusinessDay('2026-02-23', 'TW')).toBe(true);
    });

    it('週末本身應為非營業日，但 isMarketHoliday 僅針對平日之休市日', () => {
      // 2026-08-22 (週六)
      expect(isBusinessDay('2026-08-22', 'TW')).toBe(false);
      // 2026-08-23 (週日)
      expect(isBusinessDay('2026-08-23', 'TW')).toBe(false);
    });

    it('一般工作日應判定為營業日', () => {
      // 2026-08-26 (週三)
      expect(isMarketHoliday('2026-08-26', 'TW')).toBe(false);
      expect(isBusinessDay('2026-08-26', 'TW')).toBe(true);
    });
  });

  describe('美股休市日與營業日判斷 (isMarketHoliday & isBusinessDay - US)', () => {
    it('應能精確識別美股 10 大聯邦節日休市', () => {
      // 2026 馬丁路德金紀念日 (2026-01-19, 週一)
      expect(isMarketHoliday('2026-01-19', 'US')).toBe(true);
      expect(isBusinessDay('2026-01-19', 'US')).toBe(false);

      // 2026 耶穌受難日 Good Friday (2026-04-03, 週五)
      expect(isMarketHoliday('2026-04-03', 'US')).toBe(true);
      expect(isBusinessDay('2026-04-03', 'US')).toBe(false);

      // 2026 獨立日補假 (2026-07-03, 週五)
      expect(isMarketHoliday('2026-07-03', 'US')).toBe(true);
      expect(isBusinessDay('2026-07-03', 'US')).toBe(false);

      // 2026 感恩節 (2026-11-26, 週四)
      expect(isMarketHoliday('2026-11-26', 'US')).toBe(true);
      expect(isBusinessDay('2026-11-26', 'US')).toBe(false);

      // 2026 聖誕節 (2026-12-25, 週五)
      expect(isMarketHoliday('2026-12-25', 'US')).toBe(true);
      expect(isBusinessDay('2026-12-25', 'US')).toBe(false);
    });
  });

  describe('下一個營業日推算 (getNextBusinessDay)', () => {
    it('若當日為週五，下一個營業日應跳過週末至週一', () => {
      expect(getNextBusinessDay('2026-08-21', 'TW')).toBe('2026-08-24');
    });

    it('若遇到連續長假（如春節），應跳過全數連假推算至開紅盤日', () => {
      // 2026-02-11 (春節封關前最後交易日週三)，其「次營業日」應為 2026-02-23 (開紅盤週一)
      expect(getNextBusinessDay('2026-02-11', 'TW')).toBe('2026-02-23');
    });

    it('美股感恩節 (週四) 之次營業日應為週五', () => {
      expect(getNextBusinessDay('2026-11-25', 'US')).toBe('2026-11-27');
    });
  });

  describe('超出資料範圍之安全降級 (Graceful Fallback)', () => {
    it('超出 2023~2030 年份範圍時，應自動安全降級為僅避開週末，不崩潰', () => {
      // 2035-08-17 (週五) -> 下一營業日為 2035-08-20 (週一)
      expect(isBusinessDay('2035-08-17', 'TW')).toBe(true);
      expect(isBusinessDay('2035-08-18', 'TW')).toBe(false); // 週六
      expect(isBusinessDay('2035-08-19', 'TW')).toBe(false); // 週日
      expect(getNextBusinessDay('2035-08-17', 'TW')).toBe('2035-08-20');
    });

    it('傳入非法日期字串時應安全回傳', () => {
      expect(isMarketHoliday('invalid-date', 'TW')).toBe(false);
      expect(isBusinessDay('invalid-date', 'TW')).toBe(false);
      expect(getNextBusinessDay('invalid-date', 'TW')).toBe('invalid-date');
    });
  });
});
