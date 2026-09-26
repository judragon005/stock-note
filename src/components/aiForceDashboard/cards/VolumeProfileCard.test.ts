import { describe, it, expect } from 'vitest';
import { getBucketStyle, calculateBarWidthPercent } from './VolumeProfileCard';

describe('VolumeProfileCard - 籌碼熱區圖元件樣式與計算規範 (Ticket 09)', () => {
  describe('getBucketStyle - 區間色彩與視覺樣式', () => {
    it('各類型應對應明確的語意色彩 (壓力紅、大量橙、密集藍、橫平灰、支撐綠)', () => {
      expect(getBucketStyle('resistance').color).toBe('#ef4444');
      expect(getBucketStyle('heavy').color).toBe('#f59e0b');
      expect(getBucketStyle('dense').color).toBe('#38bdf8');
      expect(getBucketStyle('flat').color).toBe('#94a3b8');
      expect(getBucketStyle('support').color).toBe('#10b981');
    });
  });

  describe('calculateBarWidthPercent - 長條進度比例計算', () => {
    it('應依據百分比產生 0~100 之間的長條寬度字串', () => {
      const width = calculateBarWidthPercent(50);
      expect(width).toBe('50%');
    });

    it('負數應 clamp 為 0%，超過 100% 應 clamp 為 100%', () => {
      expect(calculateBarWidthPercent(-10)).toBe('0%');
      expect(calculateBarWidthPercent(120)).toBe('100%');
    });
  });
});
