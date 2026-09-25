import { describe, it, expect } from 'vitest';
import { calculateForecastCone } from './forecastConeEngine';

describe('ForecastConeEngine - 60日歷史漂移與波動率預測錐演算法 (Ticket 12)', () => {
  it('給定一般上漲趨勢歷史 K 線，路徑標準差必須隨時間單調擴展 (10日價差 > 5日 > 3日)', () => {
    // 建立 30 根溫和上漲的 K 線
    const candles = Array.from({ length: 30 }, (_, i) => {
      const base = 2000 + i * 10;
      return {
        high: base + 20,
        low: base - 20,
        close: base + (i % 2 === 0 ? 5 : -5),
        volume: 2000,
      };
    });

    const result = calculateForecastCone(candles);

    expect(result.timeNodes.length).toBe(4);
    const [t0, t3, t5, t10] = result.timeNodes;

    // 今日 T=0 上下限與中軸相等
    expect(t0.upperPrice).toBe(t0.medianPrice);
    expect(t0.lowerPrice).toBe(t0.medianPrice);

    // 價差隨時間單調遞增
    const spread3 = t3.upperPrice - t3.lowerPrice;
    const spread5 = t5.upperPrice - t5.lowerPrice;
    const spread10 = t10.upperPrice - t10.lowerPrice;

    expect(spread5).toBeGreaterThan(spread3);
    expect(spread10).toBeGreaterThan(spread5);
  });

  it('三種市場情境機率 (上漲/震盪/下跌) 總和必須嚴格守恆為 100%', () => {
    const candles = [
      { high: 2300, low: 2200, close: 2280, volume: 1500 },
      { high: 2320, low: 2250, close: 2300, volume: 1800 },
      { high: 2350, low: 2280, close: 2290, volume: 2000 },
      { high: 2310, low: 2240, close: 2260, volume: 1600 },
      { high: 2330, low: 2250, close: 2310, volume: 2200 },
    ];

    const result = calculateForecastCone(candles);

    const sum = result.bullishProb + result.rangeProb + result.bearishProb;
    expect(sum).toBe(100);
    expect(result.mainForceDirectionProb).toBeGreaterThanOrEqual(0);
    expect(result.mainForceDirectionProb).toBeLessThanOrEqual(100);
    expect(typeof result.annualizedDriftPercent).toBe('number');
  });

  it('當價格完全平盤零波動時，應提供安全保底波動而不引發除零或 NaN 錯誤', () => {
    const flatCandles = Array.from({ length: 20 }, () => ({
      high: 2100,
      low: 2100,
      close: 2100,
      volume: 1000,
    }));

    const result = calculateForecastCone(flatCandles);

    expect(result.timeNodes.length).toBe(4);
    expect(Number.isNaN(result.timeNodes[3].upperPrice)).toBe(false);
    expect(Number.isNaN(result.timeNodes[3].lowerPrice)).toBe(false);
    expect(result.bullishProb + result.rangeProb + result.bearishProb).toBe(100);
  });

  it('當傳入空陣列時，應安全回傳預設 4 個節點之預測路徑', () => {
    const result = calculateForecastCone([]);

    expect(result.timeNodes.length).toBe(4);
    expect(result.bullishProb + result.rangeProb + result.bearishProb).toBe(100);
  });
});
