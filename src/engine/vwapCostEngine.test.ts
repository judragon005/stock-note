import { describe, it, expect } from 'vitest';
import { calculateVwapCostStructure } from './vwapCostEngine';

describe('VwapCostEngine - 20日 VWAP 與成本結構分佈演算法規範 (Ticket 14)', () => {
  it('應準確計算 20 日典型價成交量加權平均 (VWAP) 與強弱偏離度 biasPercent', () => {
    // 兩根簡化 K 線：
    // K1: TP = (100 + 100 + 100)/3 = 100, Vol = 1000 => 100,000
    // K2: TP = (110 + 110 + 110)/3 = 110, Vol = 3000 => 330,000
    // VWAP = (100,000 + 330,000) / 4000 = 430,000 / 4000 = 107.5
    const mockCandles = [
      { high: 100, low: 100, close: 100, volume: 1000 },
      { high: 110, low: 110, close: 110, volume: 3000 },
    ];

    const result = calculateVwapCostStructure(mockCandles, 115.56);

    expect(result.mainForceVwap).toBeCloseTo(107.5, 1);
    // biasPercent = (115.56 - 107.5) / 107.5 * 100 = 7.5%
    expect(result.biasPercent).toBeCloseTo(7.5, 1);
  });

  it('四階成本帶 (突破區、大量成交區、主力成本區、套牢區) 百分比總和必須嚴格等於 100%', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      high: 2000 + i * 20,
      low: 1980 + i * 20,
      close: 1990 + i * 20,
      volume: 1000 + (i % 3) * 500,
    }));

    const result = calculateVwapCostStructure(candles);

    expect(result.bands.length).toBe(4);
    const sum = result.bands.reduce((acc, b) => acc + b.percentage, 0);
    expect(sum).toBe(100);

    const bandNames = result.bands.map((b) => b.name);
    expect(bandNames.some((n) => n.includes('倉儲') || n.includes('突破'))).toBe(true);
    expect(bandNames).toContain('大量成交區');
    expect(bandNames).toContain('主力成本區');
    expect(bandNames).toContain('套牢區');
  });


  it('當成交量全部為 0 時，應安全退回使用簡單價格平均而不引發除零錯誤', () => {
    const zeroVolCandles = [
      { high: 2000, low: 2000, close: 2000, volume: 0 },
      { high: 2100, low: 2100, close: 2100, volume: 0 },
    ];

    const result = calculateVwapCostStructure(zeroVolCandles, 2100);

    expect(Number.isNaN(result.mainForceVwap)).toBe(false);
    expect(result.mainForceVwap).toBe(2050);
    expect(result.bands.reduce((acc, b) => acc + b.percentage, 0)).toBe(100);
  });

  it('當傳入空陣列時，應安全回傳預設成本結構數據', () => {
    const result = calculateVwapCostStructure([]);

    expect(result.mainForceVwap).toBeGreaterThan(0);
    expect(result.bands.length).toBe(4);
    expect(result.bands.reduce((acc, b) => acc + b.percentage, 0)).toBe(100);
  });

  it('calculateVwapCostStructure (Spec 0144) 應輸出 4 個代表性時點之成本帶成交量節點 (timeNodes)', () => {
    const candles = Array.from({ length: 60 }, (_, i) => ({
      high: 2000 + (i % 5) * 10,
      low: 1980 + (i % 5) * 10,
      close: 1990 + (i % 5) * 10,
      volume: 1000 + i * 50,
      date: `2026-0${Math.floor(i / 20) + 6}-${(i % 20 + 1).toString().padStart(2, '0')}`,
    }));

    const result = calculateVwapCostStructure(candles);

    expect(result.timeNodes).toBeDefined();
    expect(result.timeNodes?.length).toBe(4);
    const node = result.timeNodes![0];
    expect(node.dateLabel).toBeDefined();
    expect(node.totalVolume).toBeGreaterThan(0);
  });
});

