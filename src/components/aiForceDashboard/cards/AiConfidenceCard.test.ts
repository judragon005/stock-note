import { describe, it, expect } from 'vitest';
import { calculateConfidenceGrade } from './AiConfidenceCard';
import type { AiConfidenceData } from '../../../types/aiForceDashboard';

describe('AiConfidenceCard & grade helpers', () => {
  it('應該依據不同信心分數回傳正確等級標籤與配色', () => {
    expect(calculateConfidenceGrade(85).label).toBe('高信心');
    expect(calculateConfidenceGrade(55).label).toBe('中信心');
    expect(calculateConfidenceGrade(47).label).toBe('一般信心');
    expect(calculateConfidenceGrade(20).label).toBe('偏低警示');
  });

  it('應該相容 AiConfidenceData 完整契約', () => {
    const mockData: AiConfidenceData = {
      overallConfidence: 47,
      modelAccuracy: 32,
      dataCompleteness: 100,
      signalStability: 80,
      strategyApplicability: 44,
    };
    expect(mockData.overallConfidence).toBe(47);
    expect(mockData.dataCompleteness).toBe(100);
  });
});
