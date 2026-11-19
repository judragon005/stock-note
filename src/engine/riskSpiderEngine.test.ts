import { describe, it, expect } from 'vitest';
import { calculateRiskSpider } from './riskSpiderEngine';

describe('RiskSpiderEngine - 五維量化風險評估演算法規範 (Ticket 10)', () => {
  it('當價格波動劇烈 (每日振幅達 8~10%) 時，波動風險 volatilityRisk 應顯著升高 (> 65)', () => {
    // 建立 10 根大幅度高低震盪的 K 線
    const highVolCandles = Array.from({ length: 10 }, (_, i) => ({
      high: 2200 + (i % 2 === 0 ? 150 : -50),
      low: 2000 - (i % 2 === 0 ? 50 : 150),
      close: 2100 + (i % 2 === 0 ? 80 : -80),
      volume: 3000,
    }));

    const result = calculateRiskSpider(highVolCandles);

    expect(result.volatilityRisk).toBeGreaterThan(65);
    expect(result.volatilityRisk).toBeLessThanOrEqual(100);
    expect(result.mainForceRiskIndex).toBeGreaterThanOrEqual(0);
    expect(result.mainForceRiskIndex).toBeLessThanOrEqual(100);
  });

  it('當價格完全平盤零波動時，波動風險應為低數值且絕不產生 NaN', () => {
    const flatCandles = Array.from({ length: 10 }, () => ({
      high: 2000,
      low: 2000,
      close: 2000,
      volume: 1000,
    }));

    const result = calculateRiskSpider(flatCandles);

    expect(result.volatilityRisk).toBeLessThanOrEqual(25);
    expect(Number.isNaN(result.volatilityRisk)).toBe(false);
    expect(Number.isNaN(result.mainForceRiskIndex)).toBe(false);
  });

  it('當成交量極度低迷 (平均小於 200 張) 時，流動性風險 liquidityRisk 應顯著偏高 (> 60)', () => {
    const illiquidCandles = Array.from({ length: 10 }, () => ({
      high: 2050,
      low: 1950,
      close: 2000,
      volume: 50, // 極低成交量
    }));

    const result = calculateRiskSpider(illiquidCandles);

    expect(result.liquidityRisk).toBeGreaterThan(60);
  });

  it('所有 5 維風險分數必須受限於 [0, 100] 範圍內，並產生對應的主力風險等級', () => {
    const sampleCandles = [
      { high: 2350, low: 2280, close: 2320, volume: 2500 },
      { high: 2360, low: 2300, close: 2310, volume: 2200 },
      { high: 2340, low: 2270, close: 2290, volume: 2800 },
    ];

    const result = calculateRiskSpider(sampleCandles, {
      institutionalNetVolume: -1500, // 法人顯著賣超
      turnoverRate: 4.5,
    });

    const dimensions = [
      result.liquidityRisk,
      result.volatilityRisk,
      result.trendRisk,
      result.institutionalRisk,
      result.chipRisk,
    ];

    dimensions.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    expect(['LOW', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH']).toContain(result.mainForceRiskLevel);
  });

  it('當傳入空陣列時，應遵循 Spec 0239 Zero-Mock 契約回傳零造假中性基準且不中斷', () => {
    const result = calculateRiskSpider([]);

    expect(result.mainForceRiskIndex).toBe(0);
    expect(result.mainForceRiskLevel).toBe('LOW');
    expect(result.volatilityRisk).toBe(0);
    expect(result.liquidityRisk).toBe(0);
  });

  it('Spec 0237: 當 volumeUnit="SHARES" 或 volumeInShares=true 時，應先將股數換算為張數再評估流動性風險', () => {
    const lowLotCandles = Array.from({ length: 10 }, () => ({
      high: 105,
      low: 95,
      close: 100,
      volume: 3000, // 3,000 股 = 3 張 (極低流動性)
    }));
    const highLotCandles = Array.from({ length: 10 }, () => ({
      high: 105,
      low: 95,
      close: 100,
      volume: 5_000_000, // 5,000,000 股 = 5,000 張 (高流動性)
    }));

    const lowResByUnit = calculateRiskSpider(lowLotCandles, { volumeUnit: 'SHARES' } as any);
    const highResByUnit = calculateRiskSpider(highLotCandles, { volumeUnit: 'SHARES' } as any);
    expect(lowResByUnit.liquidityRisk).toBeGreaterThanOrEqual(60);
    expect(highResByUnit.liquidityRisk).toBeLessThanOrEqual(25);

    const lowResByFlag = calculateRiskSpider(lowLotCandles, { volumeInShares: true } as any);
    const highResByFlag = calculateRiskSpider(highLotCandles, { volumeInShares: true } as any);
    expect(lowResByFlag.liquidityRisk).toBeGreaterThanOrEqual(60);
    expect(highResByFlag.liquidityRisk).toBeLessThanOrEqual(25);
  });
});
