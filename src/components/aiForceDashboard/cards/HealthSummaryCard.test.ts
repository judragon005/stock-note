import { describe, it, expect } from 'vitest';
import { calculateCircleProgress, calculateOverallHealthScore } from './HealthSummaryCard';
import type { HealthSummaryData } from '../../../types/aiForceDashboard';

describe('HealthSummaryCard & calculateCircleProgress', () => {
  it('應該精確計算半徑 22 之圓周率與 strokeDashoffset', () => {
    // 2 * PI * 22 = 138.23
    const progress50 = calculateCircleProgress(50, 22);
    expect(progress50.circumference).toBeCloseTo(138.23, 1);
    expect(progress50.strokeDashoffset).toBeCloseTo(69.115, 1);
    expect(progress50.clamped).toBe(50);
  });

  it('應該在百分比為 100% 時 dashOffset 為 0', () => {
    const progress100 = calculateCircleProgress(100, 22);
    expect(progress100.strokeDashoffset).toBe(0);
    expect(progress100.clamped).toBe(100);
  });

  it('應該在百分比為 0% 或負數時正確截斷並 dashOffset 等於圓周長', () => {
    const progress0 = calculateCircleProgress(0, 22);
    expect(progress0.strokeDashoffset).toBe(progress0.circumference);

    const progressNeg = calculateCircleProgress(-20, 22);
    expect(progressNeg.clamped).toBe(0);
    expect(progressNeg.strokeDashoffset).toBe(progressNeg.circumference);
  });

  it('應該在百分比超過 100% 時截斷至 100%', () => {
    const progressOver = calculateCircleProgress(150, 22);
    expect(progressOver.clamped).toBe(100);
    expect(progressOver.strokeDashoffset).toBe(0);
  });

  it('應該正確計算 5 項指標平均綜合評分', () => {
    const score = calculateOverallHealthScore({
      chipHealth: 55,
      technicalStructure: 80,
      capitalMomentum: 58,
      liquidityRisk: 5,
      institutionalSupport: 50,
    });
    // 平均值 (55 + 80 + 58 + 5 + 50) / 5 = 49.6 ≈ 50 分
    expect(score.averageScore).toBe(50);
    expect(score.ratingLabel).toContain('普通');
  });

  it('應該正確解析 HealthSummaryData 契約', () => {
    const mockData: HealthSummaryData = {
      chipHealth: 55,
      technicalStructure: 80,
      capitalMomentum: 58,
      liquidityRisk: 5,
      institutionalSupport: 50,
      overallRatingLabel: '普通 (平均 50 分)',
    };
    expect(mockData.overallRatingLabel).toBe('普通 (平均 50 分)');
  });
});
