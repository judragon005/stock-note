import { describe, it, expect } from 'vitest';
import { calculateDonutSegments } from './ForceDistributionCard';
import type { ForceDistributionData } from '../../../types/aiForceDashboard';

describe('ForceDistributionCard & Donut math', () => {
  it('應該精確計算半徑 32 之甜甜圈圓周長與 dasharray 佔比', () => {
    // 2 * PI * 32 = 201.06
    const donut = calculateDonutSegments(65, 35, 32);
    expect(donut.circumference).toBeCloseTo(201.06, 1);
    expect(donut.largeStrokeDasharray).toContain('130.69');
  });

  it('應該相容 ForceDistributionData 資料契約', () => {
    const mockData: ForceDistributionData = {
      largePlayerBuyPercent: 65,
      retailBuyPercent: 35,
      retailSellPressurePercent: 36,
      asOfDateText: '2026-09-18 (法人買進/賣出佔成交量比例，依 20 日平均)',
    };
    expect(mockData.largePlayerBuyPercent).toBe(65);
    expect(mockData.retailBuyPercent).toBe(35);
  });
});
