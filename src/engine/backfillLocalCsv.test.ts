import { describe, it, expect } from 'vitest';
import {
  alignCandlesWithCalendar,
  aggregateInstitutionalRows,
  computeOhlcvIndicators,
  auditDateGaps,
} from './backfillEngineCore';

describe('Backfill Engine Core (全歷史回補與日曆對齊核心)', () => {
  const mockCalendar = ['2026-09-10', '2026-09-11', '2026-09-14', '2026-09-15'];

  describe('1. alignCandlesWithCalendar (交易日曆對齊與停牌前值填補)', () => {
    it('當個股於某交易日停牌 (無資料) 時，應沿用前一日收盤價填補，成交量補 0 並標記 isHalted', () => {
      const rawCandles = [
        { date: '2026-09-10', open: 100, high: 102, low: 99, close: 101, volume: 5000 },
        // 2026-09-11 停牌缺失
        { date: '2026-09-14', open: 101, high: 103, low: 100, close: 102, volume: 4000 },
        { date: '2026-09-15', open: 102, high: 105, low: 102, close: 104, volume: 6000 },
      ];

      const aligned = alignCandlesWithCalendar(rawCandles, mockCalendar);
      expect(aligned).toHaveLength(4);

      // 檢查補齊的 2026-09-11 停牌 K 棒
      const haltedCandle = aligned.find((c) => c.date === '2026-09-11');
      expect(haltedCandle).toBeDefined();
      expect(haltedCandle?.open).toBe(101);
      expect(haltedCandle?.high).toBe(101);
      expect(haltedCandle?.low).toBe(101);
      expect(haltedCandle?.close).toBe(101); // 沿用 09-10 收盤價
      expect(haltedCandle?.volume).toBe(0);
      expect(haltedCandle?.isHalted).toBe(true);
    });

    it('若開頭日期晚於日曆，應從個股自身上市起始日開始對齊，不往前虛構不存在的資料', () => {
      const rawCandles = [
        { date: '2026-09-14', open: 50, high: 52, low: 49, close: 51, volume: 1000 },
        { date: '2026-09-15', open: 51, high: 53, low: 50, close: 52, volume: 1200 },
      ];

      const aligned = alignCandlesWithCalendar(rawCandles, mockCalendar);
      expect(aligned).toHaveLength(2);
      expect(aligned[0].date).toBe('2026-09-14');
    });
  });

  describe('2. aggregateInstitutionalRows (三大法人日報籌碼聚合)', () => {
    it('應正確將外資、投信、自營商股數換算為張數，並計算三大法人合計', () => {
      const rows = [
        { institution: 'Foreign_Investor', netShares: 5000000 }, // +5000 張
        { institution: 'Investment_Trust', netShares: 1200000 },  // +1200 張
        { institution: 'Dealer_self', netShares: -300000 },       // -300 張
        { institution: 'Dealer_Hedging', netShares: -200000 },    // -200 張
      ];

      const aggregated = aggregateInstitutionalRows(rows);
      expect(aggregated.foreignNetShares).toBe(5000);
      expect(aggregated.trustNetShares).toBe(1200);
      expect(aggregated.dealerNetShares).toBe(-500); // -300 + -200
      expect(aggregated.totalNetShares).toBe(5700);  // 5000 + 1200 - 500
    });
  });

  describe('3. computeOhlcvIndicators (技術指標批次運算連續性)', () => {
    it('連續日 K 數列運算後，指標均為有限數值，不產生 NaN', () => {
      const sampleCandles = Array.from({ length: 65 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + (i % 5),
        high: 105 + (i % 5),
        low: 98 + (i % 5),
        close: 102 + (i % 5),
        volume: 10000,
      }));

      const indicators = computeOhlcvIndicators(sampleCandles);
      expect(indicators.ma5).toBeGreaterThan(0);
      expect(indicators.ma20).toBeGreaterThan(0);
      expect(indicators.ma60).toBeGreaterThan(0);
      expect(indicators.rsi14).toBeGreaterThanOrEqual(0);
      expect(indicators.rsi14).toBeLessThanOrEqual(100);
      expect(isNaN(indicators.ma20)).toBe(false);
    });
  });

  describe('4. auditDateGaps (差距稽核偵測)', () => {
    it('當個股最新日期落後大盤時，應精準指出落後天數與缺漏日期', () => {
      const stockDates = ['2026-09-10', '2026-09-11'];
      const audit = auditDateGaps('2330', stockDates, mockCalendar);

      expect(audit.isUpToDate).toBe(false);
      expect(audit.lagDays).toBe(2);
      expect(audit.missingDates).toEqual(['2026-09-14', '2026-09-15']);
    });
  });
});
