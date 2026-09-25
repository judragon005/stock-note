import { describe, it, expect } from 'vitest';
import {
  calculatePriceRange,
  projectPriceToY,
  buildMaPolylinePoints,
} from './KLineChartCard';

describe('KLineChartCard - 主 K 線與均線計算規範 (Ticket 04)', () => {
  describe('calculatePriceRange - 價格極值與安全邊界', () => {
    it('應正確找出最高價與最低價，並增加 5% 上下留白邊界', () => {
      const candles = [
        { high: 2200, low: 2000, close: 2100, open: 2050, volume: 1000, date: '2026-09-01' },
        { high: 2400, low: 2150, close: 2300, open: 2200, volume: 1500, date: '2026-09-02' },
      ];
      const range = calculatePriceRange(candles);
      expect(range.min).toBeLessThan(2000);
      expect(range.max).toBeGreaterThan(2400);
      expect(range.span).toBe(range.max - range.min);
    });

    it('單一平盤價格時應提供預設 ±5% 邊界，防止除零錯誤', () => {
      const candles = [
        { high: 100, low: 100, close: 100, open: 100, volume: 500, date: '2026-09-01' },
      ];
      const range = calculatePriceRange(candles);
      expect(range.span).toBeGreaterThan(0);
      expect(range.min).toBeLessThan(100);
      expect(range.max).toBeGreaterThan(100);
    });
  });

  describe('projectPriceToY - 價格映射到 SVG 座標', () => {
    it('最高價應映射至頂部 (topPadding)，最低價應映射至底部 (height - bottomPadding)', () => {
      const range = { min: 100, max: 200, span: 100 };
      const height = 300;
      const topPadding = 20;
      const bottomPadding = 30;

      const yMax = projectPriceToY(200, range, height, topPadding, bottomPadding);
      expect(yMax).toBe(topPadding);

      const yMin = projectPriceToY(100, range, height, topPadding, bottomPadding);
      expect(yMin).toBe(height - bottomPadding);

      const yMid = projectPriceToY(150, range, height, topPadding, bottomPadding);
      expect(yMid).toBe((topPadding + (height - bottomPadding)) / 2);
    });
  });

  describe('buildMaPolylinePoints - 均線折線 SVG points 產生', () => {
    it('應將有效的 MA 數值轉換為 "x,y x,y" 格式字串，忽略 undefined', () => {
      const values = [undefined, 100, 150, 200];
      const range = { min: 100, max: 200, span: 100 };
      const getX = (idx: number) => idx * 10;
      const height = 200;

      const points = buildMaPolylinePoints(values, range, getX, height, 10, 10);
      // 第一個 undefined 被略過，其餘 3 個點
      const segments = points.trim().split(' ');
      expect(segments.length).toBe(3);
      expect(segments[0]).toContain('10,');
    });
  });
});
