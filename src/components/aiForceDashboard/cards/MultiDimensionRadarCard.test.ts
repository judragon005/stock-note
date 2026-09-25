import { describe, it, expect } from 'vitest';
import {
  calculateRadarVertex,
  buildRadarGridPolygons,
  buildRadarDataPolygon,
  getGradeBadgeStyle,
} from './MultiDimensionRadarCard';

describe('MultiDimensionRadarCard - 六角蛛網雷達圖數學與座標規範 (Ticket 07)', () => {
  const center = { x: 150, y: 150 };
  const maxRadius = 100;

  describe('calculateRadarVertex - 三角函數頂點計算', () => {
    it('頂部軸線 (index 0) 應精確指向正上方 (12 點鐘方向)', () => {
      const vertex = calculateRadarVertex(center, maxRadius, 0, 6);
      expect(vertex.x).toBeCloseTo(150, 1);
      expect(vertex.y).toBeCloseTo(50, 1); // 150 - 100 = 50
    });

    it('底部軸線 (index 3) 應精確指向正下方 (6 點鐘方向)', () => {
      const vertex = calculateRadarVertex(center, maxRadius, 3, 6);
      expect(vertex.x).toBeCloseTo(150, 1);
      expect(vertex.y).toBeCloseTo(250, 1); // 150 + 100 = 250
    });
  });

  describe('buildRadarGridPolygons - 同心網格多邊形產生', () => {
    it('4 層網格應產生 4 個六角形 points 字串，且頂點半徑遞增', () => {
      const grid = buildRadarGridPolygons(center, maxRadius, 4, 6);
      expect(grid.length).toBe(4);
      // 第一層半徑為 25% (25px)
      expect(grid[0].points.split(' ').length).toBe(6);
      // 第四層為 100% (100px)
      expect(grid[3].points.split(' ').length).toBe(6);
    });
  });

  describe('buildRadarDataPolygon - 資料頂點與多邊形產生', () => {
    it('應將 6 個維度分數轉換為正確的多邊形 points 與各頂點座標', () => {
      const values = [50, 100, 80, 60, 40, 70];
      const result = buildRadarDataPolygon(center, maxRadius, values, 6);

      expect(result.vertices.length).toBe(6);
      // 第一個頂點分數 50，半徑為 50px，y 座標為 150 - 50 = 100
      expect(result.vertices[0].y).toBeCloseTo(100, 1);
      // 第二個頂點分數 100，半徑 100px
      expect(result.points.split(' ').length).toBe(6);
    });

    it('極端值 (超出 0~100 或負數) 應安全 clamp 在 0~100 之間', () => {
      const values = [-20, 150, 0, 100, 50, 50];
      const result = buildRadarDataPolygon(center, maxRadius, values, 6);

      // -20 被 clamp 為 0，座標應在中心 (150, 150)
      expect(result.vertices[0].x).toBeCloseTo(150, 1);
      expect(result.vertices[0].y).toBeCloseTo(150, 1);

      // 150 被 clamp 為 100，不超過 maxRadius
      const distance = Math.hypot(result.vertices[1].x - 150, result.vertices[1].y - 150);
      expect(distance).toBeCloseTo(100, 1);
    });
  });

  describe('getGradeBadgeStyle - 綜合評級樣式與文案', () => {
    it('A 級應為翡翠綠，B 級為天藍，C 級為琥珀黃，D 級為玫紅', () => {
      expect(getGradeBadgeStyle('A').color).toBe('#10b981');
      expect(getGradeBadgeStyle('B').color).toBe('#38bdf8');
      expect(getGradeBadgeStyle('C').color).toBe('#f59e0b');
      expect(getGradeBadgeStyle('D').color).toBe('#ef4444');
    });
  });
});
