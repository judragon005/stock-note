import { describe, it, expect } from 'vitest';
import {
  calculateCompositeQuantScore,
  mapScoreToVerdictLight,
} from './aiForceDashboardEngine';

describe('Ticket 02: DynamicSignalsEngine 量化評分與燈號映射 (TDD)', () => {
  describe('calculateCompositeQuantScore - 多因子加權綜合評分', () => {
    it('應正確套用公式：0.35*chip + 0.30*trend + 0.20*momentum - 0.15*risk 並四捨五入', () => {
      // chip=80, trend=70, momentum=60, risk=20
      // 0.35*80 (28) + 0.30*70 (21) + 0.20*60 (12) - 0.15*20 (3) = 28 + 21 + 12 - 3 = 58
      const score = calculateCompositeQuantScore(70, 80, 60, 20);
      expect(score).toBe(58);
    });

    it('共振偏多情境應產出高分 (>= 60)', () => {
      // chip=90, trend=85, momentum=80, risk=10
      // 0.35*90 (31.5) + 0.30*85 (25.5) + 0.20*80 (16) - 0.15*10 (1.5) = 71.5 -> 72
      const score = calculateCompositeQuantScore(85, 90, 80, 10);
      expect(score).toBe(72);
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('極低分時應有 0 分下限保護 (不出現負數)', () => {
      // chip=0, trend=0, momentum=0, risk=100
      // 0 - 15 = -15 -> 0
      const score = calculateCompositeQuantScore(0, 0, 0, 100);
      expect(score).toBe(0);
    });

    it('極高分時應有 100 分上限保護', () => {
      const score = calculateCompositeQuantScore(150, 150, 150, 0);
      expect(score).toBe(100);
    });

    it('支援自訂策略權重 weights 參數', () => {
      // chip=100, trend=50, momentum=50, risk=0
      // 0.6*100 (60) + 0.2*50 (10) + 0.1*50 (5) - 0.1*0 (0) = 75
      const score = calculateCompositeQuantScore(50, 100, 50, 0, {
        chipWeight: 0.6,
        trendWeight: 0.2,
        momentumWeight: 0.1,
        riskWeight: 0.1,
      });
      expect(score).toBe(75);
    });
  });

  describe('mapScoreToVerdictLight - 分數映射至動態燈號', () => {
    it('分數 >= 60 應映射為 GREEN (偏多 / 安全)', () => {
      expect(mapScoreToVerdictLight(60)).toBe('GREEN');
      expect(mapScoreToVerdictLight(75)).toBe('GREEN');
      expect(mapScoreToVerdictLight(100)).toBe('GREEN');
    });

    it('分數 40 ~ 59 應映射為 YELLOW (觀望 / 中性)', () => {
      expect(mapScoreToVerdictLight(40)).toBe('YELLOW');
      expect(mapScoreToVerdictLight(50)).toBe('YELLOW');
      expect(mapScoreToVerdictLight(59)).toBe('YELLOW');
    });

    it('分數 < 40 應映射為 RED (偏空 / 高風險)', () => {
      expect(mapScoreToVerdictLight(39)).toBe('RED');
      expect(mapScoreToVerdictLight(20)).toBe('RED');
      expect(mapScoreToVerdictLight(0)).toBe('RED');
    });
  });
});
