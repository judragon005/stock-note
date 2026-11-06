import { describe, it, expect } from 'vitest';
import { findLatestCloseBeforeDate } from './binarySearch';
import { DailyCandle } from '../types/indicators';

describe('findLatestCloseBeforeDate - 二元搜尋歷史收盤價', () => {
  const sampleCandles: DailyCandle[] = [
    { date: '2026-01-05', open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // 週一
    { date: '2026-01-06', open: 102, high: 108, low: 101, close: 106, volume: 1200 }, // 週二
    { date: '2026-01-07', open: 106, high: 110, low: 105, close: 108, volume: 1500 }, // 週三
    { date: '2026-01-08', open: 108, high: 109, low: 103, close: 104, volume: 1100 }, // 週四
    { date: '2026-01-09', open: 104, high: 107, low: 102, close: 105, volume: 1300 }, // 週五
    { date: '2026-01-12', open: 105, high: 112, low: 105, close: 111, volume: 2000 }, // 下週一
  ];

  it('1. 應在完全命中交易日時精準回傳該日收盤價', () => {
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-07')).toBe(108);
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-05')).toBe(102);
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-12')).toBe(111);
  });

  it('2. 當目標日期為休市日 (週末或假日) 時，應自動回溯取得前一交易日收盤價', () => {
    // 2026-01-10 (週六) 與 2026-01-11 (週日) 應取 2026-01-09 (週五) 之 105
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-10')).toBe(105);
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-11')).toBe(105);
  });

  it('3. 當目標日期早於所有歷史 K 線之首日時，應安全回傳 null', () => {
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-01')).toBeNull();
    expect(findLatestCloseBeforeDate(sampleCandles, '2025-12-31')).toBeNull();
  });

  it('4. 當目標日期晚於所有歷史 K 線之末日時，應回傳最新一筆 K 線之收盤價', () => {
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-01-20')).toBe(111);
    expect(findLatestCloseBeforeDate(sampleCandles, '2026-12-31')).toBe(111);
  });

  it('5. 當日 K 線陣列為空、null 或 undefined 時，應防禦回傳 null', () => {
    expect(findLatestCloseBeforeDate([], '2026-01-07')).toBeNull();
    expect(findLatestCloseBeforeDate(null, '2026-01-07')).toBeNull();
    expect(findLatestCloseBeforeDate(undefined, '2026-01-07')).toBeNull();
  });

  it('6. 單根 K 線的邊界測試', () => {
    const singleCandle: DailyCandle[] = [
      { date: '2026-03-31', open: 50, high: 52, low: 49, close: 51, volume: 500 },
    ];
    expect(findLatestCloseBeforeDate(singleCandle, '2026-03-30')).toBeNull();
    expect(findLatestCloseBeforeDate(singleCandle, '2026-03-31')).toBe(51);
    expect(findLatestCloseBeforeDate(singleCandle, '2026-04-01')).toBe(51);
  });
});
