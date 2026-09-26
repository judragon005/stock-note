import { describe, it, expect } from 'vitest';
import { calculateDayTradeRisk } from './dayTradeRiskEngine';

describe('DayTradeRiskEngine - 隔日沖 5 大風險量化指標演算法規範 (Ticket 18)', () => {
  it('當暴量留長上影線 (開高走低) 時，主力賣出異常與回檔風險應顯著升高 (> 60)', () => {
    // 模擬一根長上影線黑 K，成交量為均量的 3 倍
    const candles = [
      { open: 2000, high: 2020, low: 1980, close: 2000, volume: 1000 },
      { open: 2000, high: 2020, low: 1980, close: 2000, volume: 1000 },
      { open: 2050, high: 2250, low: 2040, close: 2060, volume: 3500 }, // 衝高 2250 後爆量殺回收 2060
    ];

    const result = calculateDayTradeRisk(candles);

    expect(result.abnormalSelling).toBeGreaterThan(60);
    expect(result.pullbackRisk).toBeGreaterThan(60);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.riskIndex).toBeGreaterThan(50);
  });

  it('所有 5 項量化指標必須受限於 0% 到 100% 之間', () => {
    const candles = [
      { open: 2100, high: 2140, low: 2090, close: 2120, volume: 1500 },
      { open: 2120, high: 2150, low: 2110, close: 2140, volume: 1600 },
    ];

    const result = calculateDayTradeRisk(candles);

    const metrics = [
      result.abnormalSelling,
      result.turnoverRate,
      result.dayTradeRatio,
      result.pullbackRisk,
      result.intradayVolatility,
    ];

    metrics.forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    });

    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskLevel);
  });

  it('平盤零波動或空陣列時，應安全回傳預設數值而不引發除零或 NaN 錯誤', () => {
    const flatCandles = [
      { open: 2000, high: 2000, low: 2000, close: 2000, volume: 0 },
    ];

    const result = calculateDayTradeRisk(flatCandles);

    expect(Number.isNaN(result.abnormalSelling)).toBe(false);
    expect(Number.isNaN(result.intradayVolatility)).toBe(false);
    expect(result.riskLevel).toBeDefined();
  });
});
