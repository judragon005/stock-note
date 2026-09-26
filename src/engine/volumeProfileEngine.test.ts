import { describe, it, expect } from 'vitest';
import { calculateVolumeProfile } from './volumeProfileEngine';

describe('VolumeProfileEngine - 成交量價位分佈演算法 (Ticket 08)', () => {
  it('給定一般 K 線序列，應正確計算 5 個價位桶且百分比總和為 100%', () => {
    const candles = [
      { high: 2200, low: 2100, close: 2180, volume: 1000 },
      { high: 2150, low: 2050, close: 2100, volume: 1500 },
      { high: 2100, low: 2000, close: 2050, volume: 2000 },
      { high: 2050, low: 1950, close: 2000, volume: 2500 },
      { high: 2000, low: 1900, close: 1950, volume: 1000 },
    ];

    const result = calculateVolumeProfile(candles);

    expect(result.buckets.length).toBe(5);
    // 驗證類型與標籤順序（由高至低）
    expect(result.buckets[0].type).toBe('resistance');
    expect(result.buckets[0].label).toBe('壓力區');
    expect(result.buckets[4].type).toBe('support');
    expect(result.buckets[4].label).toBe('支撐區');

    // 價格區間應該是遞降或由高到低連續分佈
    expect(result.buckets[0].priceMax).toBeGreaterThan(result.buckets[0].priceMin);
    expect(result.buckets[0].priceMax).toBeGreaterThan(result.buckets[4].priceMax);

    // 百分比總和必須嚴格等於 100
    const sumPercent = result.buckets.reduce((acc, b) => acc + b.percentage, 0);
    expect(sumPercent).toBe(100);

    // 必須包含多空標籤文字
    expect(result.bullBearFooterTag).toBeTruthy();
  });

  it('當無 K 線資料或為空陣列時，應安全回傳預設 5 個均勻桶且總和為 100%', () => {
    const result = calculateVolumeProfile([]);

    expect(result.buckets.length).toBe(5);
    const sumPercent = result.buckets.reduce((acc, b) => acc + b.percentage, 0);
    expect(sumPercent).toBe(100);
  });

  it('當所有 K 線價格相同（零震幅平盤）時，應安全建立留白邊界而不引發除零錯誤', () => {
    const candles = [
      { high: 2000, low: 2000, close: 2000, volume: 500 },
      { high: 2000, low: 2000, close: 2000, volume: 500 },
    ];

    const result = calculateVolumeProfile(candles);

    expect(result.buckets.length).toBe(5);
    expect(result.buckets[0].priceMax).toBeGreaterThan(result.buckets[4].priceMin);
    const sumPercent = result.buckets.reduce((acc, b) => acc + b.percentage, 0);
    expect(sumPercent).toBe(100);
  });
});
