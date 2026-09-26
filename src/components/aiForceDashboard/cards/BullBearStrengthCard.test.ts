import { describe, it, expect } from 'vitest';
import { calculateSignalTier } from './BullBearStrengthCard';
import type { BullBearStrengthData } from '../../../types/aiForceDashboard';

describe('BullBearStrengthCard & signal tier calculations', () => {
  it('應該依據不同綜合評分正確判定 1~5 級信號階層', () => {
    expect(calculateSignalTier(88).tier).toBe(1);
    expect(calculateSignalTier(70).tier).toBe(2);
    expect(calculateSignalTier(55).tier).toBe(3);
    expect(calculateSignalTier(40).tier).toBe(4);
    expect(calculateSignalTier(20).tier).toBe(5);
  });

  it('應該完整相容 BullBearStrengthData 資料契約', () => {
    const mockData: BullBearStrengthData = {
      bullStrengthPercent: 58,
      bearStrengthPercent: 42,
      volumeStrengthPercent: 53,
      signalTierLevel: 2,
      compositeScore: 70,
    };
    expect(mockData.bullStrengthPercent).toBe(58);
    expect(mockData.compositeScore).toBe(70);
  });
});
