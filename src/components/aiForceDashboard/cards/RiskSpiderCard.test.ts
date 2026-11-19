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

  describe('五角蛛網全景放大與大字級易讀性規範 (Ticket 04)', () => {
    it('雷達圖半徑應放大至 120 且標籤字級提升至 15px / 數值 14px', async () => {
      const { RISK_SPIDER_CONFIG } = await import('./RiskSpiderCard');
      expect(RISK_SPIDER_CONFIG.maxRadius).toBeGreaterThanOrEqual(120);
      expect(RISK_SPIDER_CONFIG.labelFontSize).toBeGreaterThanOrEqual(15);
      expect(RISK_SPIDER_CONFIG.scoreFontSize).toBeGreaterThanOrEqual(14);
    });
  });

  describe('Ticket 07 (Spec 0239): 風險雷達視口收緊、容器最小高度與字級/對比度底線驗收', () => {
    it('RiskSpiderCard 應具備 >= 260px 容器高度、收緊之 viewBox，且不含 #64748b 與 <0.75rem', async () => {
      // @ts-expect-error 測試環境無 @types/node 型別定義
      const fs = await import('node:fs');
      // @ts-expect-error 測試環境無 @types/node 型別定義
      const path = await import('node:path');
      // @ts-expect-error 測試環境使用 Node __dirname
      const src = fs.readFileSync(path.resolve(__dirname, 'RiskSpiderCard.tsx'), 'utf-8');

      expect(src).toMatch(/minHeight:\s*['"]2[6-9]\dpx['"]/);
      expect(src).not.toMatch(/#64748b/i);

      const remMatches = [...src.matchAll(/fontSize:\s*['"](\d+(?:\.\d+)?)rem['"]/g)];
      for (const m of remMatches) {
        expect(Number(m[1]), `發現過小 rem 字級: ${m[0]}`).toBeGreaterThanOrEqual(0.75);
      }
    });
  });
});
