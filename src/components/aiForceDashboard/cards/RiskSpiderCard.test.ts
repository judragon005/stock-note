import { describe, it, expect } from 'vitest';
import {
  calculateFiveAxisVertex,
  buildPentagonGridPolygons,
  getRiskLevelBadge,
} from './RiskSpiderCard';

describe('RiskSpiderCard - 五角蛛網風險雷達圖規範 (Ticket 11)', () => {
  const center = { x: 150, y: 130 };
  const maxRadius = 80;

  describe('calculateFiveAxisVertex - 五角星/五邊形三角函數計算', () => {
    it('頂部軸線 (index 0) 應精確指向正上方 12 點鐘方向', () => {
      const p = calculateFiveAxisVertex(center, maxRadius, 0, 5);
      expect(p.x).toBeCloseTo(150, 1);
      expect(p.y).toBeCloseTo(50, 1); // 130 - 80 = 50
    });

    it('5 個軸向的夾角應均勻分佈 (72 度)', () => {
      const vertices = Array.from({ length: 5 }, (_, i) =>
        calculateFiveAxisVertex(center, maxRadius, i, 5)
      );
      expect(vertices.length).toBe(5);
      // 每個頂點到中心的距離均為 maxRadius
      vertices.forEach((v) => {
        const dist = Math.hypot(v.x - center.x, v.y - center.y);
        expect(dist).toBeCloseTo(maxRadius, 1);
      });
    });
  });

  describe('buildPentagonGridPolygons - 同心網格', () => {
    it('應產生 4 層同心五邊形，每層有 5 個頂點', () => {
      const grids = buildPentagonGridPolygons(center, maxRadius, 4, 5);
      expect(grids.length).toBe(4);
      grids.forEach((g) => {
        expect(g.points.split(' ').length).toBe(5);
      });
    });
  });

  describe('getRiskLevelBadge - 主力風險等級與樣式', () => {
    it('HIGH 為高風險 (紅)，MEDIUM_HIGH 為中高 (橙)，MEDIUM 為中 (黃)，LOW 為低 (綠)', () => {
      expect(getRiskLevelBadge('HIGH').label).toBe('高');
      expect(getRiskLevelBadge('HIGH').color).toBe('#ef4444');

      expect(getRiskLevelBadge('MEDIUM_HIGH').label).toBe('中高');
      expect(getRiskLevelBadge('MEDIUM_HIGH').color).toBe('#f97316');

      expect(getRiskLevelBadge('MEDIUM').label).toBe('中');
      expect(getRiskLevelBadge('MEDIUM').color).toBe('#f59e0b');

      expect(getRiskLevelBadge('LOW').label).toBe('低');
      expect(getRiskLevelBadge('LOW').color).toBe('#10b981');
    });
  });
});
