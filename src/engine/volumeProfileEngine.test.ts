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

  it('應依據價格範圍自適應產生 5 個由大到小排序的價格刻度 (priceTicks)', () => {
    // 100~200 元的低價股
    const lowPriceCandles = [
      { high: 200, low: 180, close: 195, volume: 500 },
      { high: 185, low: 150, close: 160, volume: 800 },
      { high: 160, low: 120, close: 130, volume: 600 },
      { high: 135, low: 100, close: 110, volume: 900 },
      { high: 125, low: 95, close: 105, volume: 700 },
    ];
    const result = calculateVolumeProfile(lowPriceCandles);
    expect(result.priceTicks).toBeDefined();
    expect(result.priceTicks?.length).toBe(5);
    // 必須由大到小排序
    for (let i = 0; i < 4; i++) {
      expect(result.priceTicks![i]).toBeGreaterThanOrEqual(result.priceTicks![i + 1]);
    }
    // 最大刻度應在 200 左右，而非硬編碼的 2400
    expect(result.priceTicks![0]).toBeLessThan(300);
    expect(result.priceTicks![4]).toBeGreaterThanOrEqual(80);
  });

  it('應動態生成 4 欄週期熱力矩陣 (近5日、近10日、近20日、近60日)，每欄各 9 個 cells', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 1000 + i * 10,
      low: 950 + i * 10,
      close: 980 + i * 10,
      volume: 1000 + (i % 5) * 500,
    }));
    const result = calculateVolumeProfile(candles);
    expect(result.heatmapColumns).toBeDefined();
    expect(result.heatmapColumns?.length).toBe(4);
    expect(result.heatmapColumns?.[0].label).toBe('近5日');
    expect(result.heatmapColumns?.[3].label).toBe('近60日');
    // 每欄 9 個色塊階梯
    expect(result.heatmapColumns?.[0].cells.length).toBe(9);
  });
});

