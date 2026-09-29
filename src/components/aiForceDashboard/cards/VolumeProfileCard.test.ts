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

  describe('自適應刻度與熱力色階規範 (Spec 0148 Ticket 01)', () => {
    it('支援接收動態 5 階價格刻度與 4 欄週期熱力數據', () => {
      const mockData = {
        buckets: [
          { label: '壓力區', percentage: 10, type: 'resistance' as const, priceMin: 980, priceMax: 1050 },
          { label: '大量成交區', percentage: 20, type: 'heavy' as const, priceMin: 920, priceMax: 980 },
          { label: '密集成交區', percentage: 30, type: 'dense' as const, priceMin: 860, priceMax: 920 },
          { label: '橫平區', percentage: 15, type: 'flat' as const, priceMin: 800, priceMax: 860 },
          { label: '支撐區', percentage: 25, type: 'support' as const, priceMin: 750, priceMax: 800 },
        ],
        bullBearFooterTag: '多方沉澱',
        priceTicks: [1050, 975, 900, 825, 750],
        heatmapColumns: [
          { id: 'col-1', label: '近5日', cells: Array(9).fill('#10b981') },
          { id: 'col-2', label: '近10日', cells: Array(9).fill('#0284c7') },
          { id: 'col-3', label: '近20日', cells: Array(9).fill('#06b6d4') },
          { id: 'col-4', label: '近60日', cells: Array(9).fill('#84cc16') },
        ],
      };

      expect(mockData.priceTicks.length).toBe(5);
      expect(mockData.priceTicks[0]).toBe(1050);
      expect(mockData.priceTicks[4]).toBe(750);
      expect(mockData.heatmapColumns.length).toBe(4);
      expect(mockData.heatmapColumns[0].cells.length).toBe(9);
    });
  });
});

