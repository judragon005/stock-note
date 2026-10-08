import { describe, it, expect } from 'vitest';
import {
  aggregateCandlesToTimeframe,
  calculateKlineMovingAverages,
  getWeekIdentifier,
} from './klineAggregationEngine';
import { KlineCandleItem } from '../types/aiForceDashboard';

describe('klineAggregationEngine - 日 K 聚合為週 K / 月 K (Spec 0169 / Ticket 06)', () => {
  const mockDailyCandles: KlineCandleItem[] = [
    // 2026-09-01 (二)
    { date: '2026-09-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
    // 2026-09-02 (三)
    { date: '2026-09-02', open: 102, high: 108, low: 101, close: 106, volume: 1200 },
    // 2026-09-03 (四)
    { date: '2026-09-03', open: 106, high: 107, low: 103, close: 104, volume: 800 },
    // 2026-09-04 (五) - 本週結束
    { date: '2026-09-04', open: 104, high: 110, low: 103, close: 109, volume: 1500 },

    // 2026-09-07 (一) - 次週開始
    { date: '2026-09-07', open: 109, high: 112, low: 107, close: 111, volume: 1100 },
    // 2026-09-08 (二)
    { date: '2026-09-08', open: 111, high: 115, low: 110, close: 113, volume: 1300 },
    // 2026-09-09 (三)
    { date: '2026-09-09', open: 113, high: 114, low: 108, close: 109, volume: 900 },
    // 2026-09-10 (四)
    { date: '2026-09-10', open: 109, high: 111, low: 106, close: 107, volume: 850 },
    // 2026-09-11 (五) - 次週結束
    { date: '2026-09-11', open: 107, high: 110, low: 105, close: 108, volume: 950 },

    // 2026-10-01 (四) - 跨月開始
    { date: '2026-10-01', open: 108, high: 113, low: 107, close: 112, volume: 1000 },
    // 2026-10-02 (五)
    { date: '2026-10-02', open: 112, high: 116, low: 111, close: 115, volume: 1400 },
  ];

  it('DAY 模式應維持原數列與長度，並確保均線存在', () => {
    const result = aggregateCandlesToTimeframe(mockDailyCandles, 'DAY');
    expect(result.length).toBe(mockDailyCandles.length);
    expect(result[0].date).toBe('2026-09-01');
    expect(result[result.length - 1].date).toBe('2026-10-02');
  });

  it('WEEK 模式應精確將日 K 聚合為週 K（開盤取週初、收盤取週末、最高/最低取極值、成交量加總）', () => {
    const weekly = aggregateCandlesToTimeframe(mockDailyCandles, 'WEEK');
    // 共有 3 週 (第一週 4 天, 第二週 5 天, 10月第一週 2 天)
    expect(weekly.length).toBe(3);

    // 第 1 週 (2026-09-01 ~ 2026-09-04)
    const week1 = weekly[0];
    expect(week1.date).toBe('2026-09-04'); // 取該週最新交易日
    expect(week1.open).toBe(100);
    expect(week1.close).toBe(109);
    expect(week1.high).toBe(110);
    expect(week1.low).toBe(98);
    expect(week1.volume).toBe(1000 + 1200 + 800 + 1500); // 4500

    // 第 2 週 (2026-09-07 ~ 2026-09-11)
    const week2 = weekly[1];
    expect(week2.date).toBe('2026-09-11');
    expect(week2.open).toBe(109);
    expect(week2.close).toBe(108);
    expect(week2.high).toBe(115);
    expect(week2.low).toBe(105);
    expect(week2.volume).toBe(1100 + 1300 + 900 + 850 + 950); // 5100
  });

  it('MONTH 模式應精確將日 K 聚合為月 K（跨月邊界隔離）', () => {
    const monthly = aggregateCandlesToTimeframe(mockDailyCandles, 'MONTH');
    // 包含 9 月與 10 月共 2 根
    expect(monthly.length).toBe(2);

    // 9 月
    const sep = monthly[0];
    expect(sep.date).toBe('2026-09-11');
    expect(sep.open).toBe(100);
    expect(sep.close).toBe(108);
    expect(sep.high).toBe(115);
    expect(sep.low).toBe(98);
    expect(sep.volume).toBe(4500 + 5100); // 9600

    // 10 月
    const oct = monthly[1];
    expect(oct.date).toBe('2026-10-02');
    expect(oct.open).toBe(108);
    expect(oct.close).toBe(115);
    expect(oct.high).toBe(116);
    expect(oct.low).toBe(107);
    expect(oct.volume).toBe(2400);
  });

  it('calculateKlineMovingAverages 應動態重算 MA5, MA10, MA20 等均線', () => {
    const candles: KlineCandleItem[] = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 110,
      low: 90,
      close: 100 + i * 2, // 100, 102, 104, 106, 108 ...
      volume: 1000,
    }));

    const withMa = calculateKlineMovingAverages(candles);
    // 前 4 根不足 5，ma5 應為 undefined
    expect(withMa[3].ma5).toBeUndefined();
    // 第 5 根 (index 4): close 分別為 100, 102, 104, 106, 108 -> sum = 520 -> ma5 = 104
    expect(withMa[4].ma5).toBe(104);

    // 第 10 根 (index 9): close 分別為 100 到 118 -> ma10 應存在
    expect(withMa[9].ma10).toBeDefined();
    expect(withMa[9].ma10).toBe(109);
  });

  it('當輸入空陣列時，aggregateCandlesToTimeframe 應安全回傳空陣列', () => {
    expect(aggregateCandlesToTimeframe([], 'WEEK')).toEqual([]);
    expect(aggregateCandlesToTimeframe(undefined as unknown as KlineCandleItem[], 'MONTH')).toEqual([]);
  });

  it('跨年邊界週識別測試 (getWeekIdentifier)', () => {
    const week2025End = getWeekIdentifier('2025-12-31');
    const week2026Start = getWeekIdentifier('2026-01-02');
    // 2025-12-31 是週三，2026-01-02 是週五，同一週應識別為同一個 week identifier
    expect(week2025End).toBe(week2026Start);
  });
});
