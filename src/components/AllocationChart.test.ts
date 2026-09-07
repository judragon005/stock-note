import { describe, it, expect } from 'vitest';
import {
  calculateLtvPercent,
  formatLtvBadgeText,
} from './AllocationChart';

describe('AllocationChart 資產配置、權重清單與 LTV 膠囊規範測試 (PRD #0072)', () => {
  describe('LTV 負債比計算 (calculateLtvPercent)', () => {
    it('總資產 100 萬，借款 25 萬，LTV 應為 25.0%', () => {
      const ltv = calculateLtvPercent(250000, 1000000);
      expect(ltv).toBe(25);
    });

    it('零借款時 LTV 應為 0%', () => {
      const ltv = calculateLtvPercent(0, 1000000);
      expect(ltv).toBe(0);
    });

    it('總資產為 0 或負數時應安全回傳 0%', () => {
      expect(calculateLtvPercent(50000, 0)).toBe(0);
      expect(calculateLtvPercent(50000, -100)).toBe(0);
    });

    it('借款為負數時應防呆回傳 0%', () => {
      expect(calculateLtvPercent(-5000, 1000000)).toBe(0);
    });
  });

  describe('LTV 膠囊文字格式化 (formatLtvBadgeText)', () => {
    it('應正確格式化負債比膠囊文字', () => {
      expect(formatLtvBadgeText(25.4)).toBe('負債比 LTV 25.4%');
      expect(formatLtvBadgeText(0)).toBe('負債比 LTV 0.0%');
    });
  });
});
