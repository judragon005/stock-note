import { describe, it, expect } from 'vitest';
import {
  getNthDayOfWeek,
  getThirdWednesday,
  getThirdFriday,
  getFirstFriday,
  getSecondWednesday,
  generatePeriodicCatalysts,
} from './periodicCatalystEngine';

describe('常態金融週期推算引擎 (periodicCatalystEngine)', () => {
  describe('1. 星期推算演算法 (getNthDayOfWeek)', () => {
    it('應能透過 getNthDayOfWeek 精確找出某月份第 N 個特定星期', () => {
      expect(getNthDayOfWeek(2026, 10, 1, 1)).toBe('2026-10-05');
    });

    it('應精確算出 2026 年 10 月的第三個星期三（台指期月結算）為 2026-10-21', () => {
      expect(getThirdWednesday(2026, 10)).toBe('2026-10-21');
    });

    it('應精確算出 2026 年 10 月的第三個星期五（美股選擇權到期）為 2026-10-16', () => {
      expect(getThirdFriday(2026, 10)).toBe('2026-10-16');
    });

    it('應精確算出 2026 年 12 月的第三個星期五（美股四巫日）為 2026-12-18', () => {
      expect(getThirdFriday(2026, 12)).toBe('2026-12-18');
    });

    it('應精確算出 2026 年 11 月的第一個星期五（非農就業公布日）為 2026-11-06', () => {
      expect(getFirstFriday(2026, 11)).toBe('2026-11-06');
    });

    it('應精確算出 2026 年 11 月的第二個星期三（CPI通膨估計公布日）為 2026-11-11', () => {
      expect(getSecondWednesday(2026, 11)).toBe('2026-11-11');
    });
  });

  describe('2. 常態週期催化劑生成 (generatePeriodicCatalysts)', () => {
    it('從 2026-10-17 往後推算 2 個月，應產生 10 月與 11 月的台指結算、四巫/月結算與非農', () => {
      const list = generatePeriodicCatalysts('2026-10-17', 2);
      expect(list.length).toBeGreaterThan(0);

      const twFuturesOct = list.find((c) => c.id === 'periodic-tx-settle-2026-10');
      expect(twFuturesOct).toBeDefined();
      expect(twFuturesOct?.date).toBe('2026-10-21');
      expect(twFuturesOct?.category).toBe('DERIVATIVE_SETTLEMENT');
      expect(twFuturesOct?.impact).toBe('HIGH');
      expect(twFuturesOct?.targetMarket).toBe('TW');

      const usNfpNov = list.find((c) => c.id === 'periodic-nfp-2026-11');
      expect(usNfpNov).toBeDefined();
      expect(usNfpNov?.date).toBe('2026-11-06');
      expect(usNfpNov?.category).toBe('EMPLOYMENT');
      expect(usNfpNov?.impact).toBe('HIGH');
      expect(usNfpNov?.targetMarket).toBe('US');
    });

    it('當跨越 12 月時，應正確將 12 月標註為美股四巫日 (Quadruple Witching)', () => {
      const list = generatePeriodicCatalysts('2026-12-01', 1);
      const decWitching = list.find((c) => c.id === 'periodic-us-witching-2026-12');
      expect(decWitching).toBeDefined();
      expect(decWitching?.name).toContain('四巫日');
      expect(decWitching?.date).toBe('2026-12-18');
      expect(decWitching?.impact).toBe('HIGH');
    });
  });
});
