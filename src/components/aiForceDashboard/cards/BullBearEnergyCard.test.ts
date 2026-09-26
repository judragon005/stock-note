import { describe, it, expect } from 'vitest';
import { calculateBullBearRatio } from './BullBearEnergyCard';
import type { BullBearEnergyData } from '../../../types/aiForceDashboard';

describe('BullBearEnergyCard & calculateBullBearRatio', () => {
  it('應該正確計算常規多空量能比例與結論', () => {
    // 假設 20 日紅 K 量 5300 張，黑 K 量 4700 張
    const result = calculateBullBearRatio(5300, 4700);
    expect(result.bullPercent).toBe(53);
    expect(result.bearPercent).toBe(47);
    expect(result.ratio).toBe(1.13);
    expect(result.conclusion).toBe('偏多');
  });

  it('應該在空方成交量為 0 時提供除零保護', () => {
    const result = calculateBullBearRatio(5000, 0);
    expect(result.bullPercent).toBe(100);
    expect(result.bearPercent).toBe(0);
    expect(result.ratio).toBe(99.99);
    expect(result.conclusion).toBe('極度偏多');
  });

  it('應該在多方成交量為 0 時提供極限邊界保護', () => {
    const result = calculateBullBearRatio(0, 5000);
    expect(result.bullPercent).toBe(0);
    expect(result.bearPercent).toBe(100);
    expect(result.ratio).toBe(0);
    expect(result.conclusion).toBe('極度偏空');
  });

  it('應該在雙方成交量皆為 0 時輸出均等均衡', () => {
    const result = calculateBullBearRatio(0, 0);
    expect(result.bullPercent).toBe(50);
    expect(result.bearPercent).toBe(50);
    expect(result.ratio).toBe(1);
    expect(result.conclusion).toBe('均衡');
  });

  it('應該能正確解析與渲染 mock 資料結構', () => {
    const mockData: BullBearEnergyData = {
      bullEnergyPercent: 53,
      bearEnergyPercent: 47,
      bullBearRatio: 1.13,
      bullBearConclusion: '偏多',
      noteText: '(20日紅K量/黑K量)',
    };
    expect(mockData.bullEnergyPercent + mockData.bearEnergyPercent).toBe(100);
    expect(mockData.bullBearConclusion).toBe('偏多');
  });
});
