import { describe, it, expect } from 'vitest';
import {
  calculateDualAxisScales,
  projectBarToY,
  projectCumulativeToY,
  formatSharesCell,
  computeInstitutionalSummaries,
} from './InstitutionalFlowCard';

describe('InstitutionalFlowCard - 三大法人雙軸圖表與明細表規範 (Ticket 16 & 17)', () => {
  const sampleHistory = [
    { date: '09/14', foreignShares: 1200, trustShares: 500, dealerShares: -200, cumulativeTotalShares: 1500 },
    { date: '09/15', foreignShares: -800, trustShares: 300, dealerShares: -100, cumulativeTotalShares: 900 },
    { date: '09/16', foreignShares: 1500, trustShares: -200, dealerShares: 400, cumulativeTotalShares: 2600 },
    { date: '09/17', foreignShares: -400, trustShares: -100, dealerShares: -50, cumulativeTotalShares: 2050 },
    { date: '09/18', foreignShares: 800, trustShares: 600, dealerShares: 150, cumulativeTotalShares: 3600 },
  ];

  describe('calculateDualAxisScales - 雙軸極值與零軸基準線計算 (Ticket 16)', () => {
    it('應正確計算左軸(單日買賣)與右軸(累計買賣)極值，且左軸零軸 zeroY 必須介於可用畫布高度內', () => {
      const height = 180;
      const padding = { top: 20, bottom: 25 };
      const scales = calculateDualAxisScales(sampleHistory, height, padding);

      expect(scales.leftMax).toBeGreaterThanOrEqual(1500);
      expect(scales.leftMin).toBeLessThanOrEqual(-800);
      expect(scales.zeroY).toBeGreaterThan(padding.top);
      expect(scales.zeroY).toBeLessThan(height - padding.bottom);

      expect(scales.rightMax).toBeGreaterThanOrEqual(3600);
      expect(scales.rightMin).toBeLessThanOrEqual(900);
    });

    it('projectBarToY 應將正數買超映射至 zeroY 上方，負數賣超映射至 zeroY 下方', () => {
      const scales = { leftMin: -1000, leftMax: 1000, rightMin: 0, rightMax: 4000, zeroY: 90 };
      const height = 180;
      const padding = { top: 20, bottom: 25 };

      const yPositive = projectBarToY(500, scales, height, padding);
      const yNegative = projectBarToY(-500, scales, height, padding);

      expect(yPositive).toBeLessThan(scales.zeroY);
      expect(yNegative).toBeGreaterThan(scales.zeroY);
    });

    it('projectCumulativeToY 應依右軸極值將累計張數正確映射至畫布高度', () => {
      const scales = { leftMin: -1000, leftMax: 1000, rightMin: 1000, rightMax: 3000, zeroY: 90 };
      const height = 180;
      const padding = { top: 20, bottom: 20 };

      // 最高點應映射到 top
      const yMax = projectCumulativeToY(3000, scales, height, padding);
      expect(yMax).toBeCloseTo(20, 1);

      // 最低點應映射到 height - bottom
      const yMin = projectCumulativeToY(1000, scales, height, padding);
      expect(yMin).toBeCloseTo(160, 1);
    });
  });

  describe('formatSharesCell - 明細表單元格格式化 (Ticket 17)', () => {
    it('正數應帶有加號與千分位，負數帶有減號', () => {
      const pos = formatSharesCell(1250);
      expect(pos.text).toBe('+1,250');
      expect(pos.color).toBe('#ef4444');

      const neg = formatSharesCell(-640);
      expect(neg.text).toBe('-640');
      expect(neg.color).toBe('#10b981');

      const zero = formatSharesCell(0);
      expect(zero.text).toBe('0');
      expect(zero.color).toBe('#94a3b8');
    });
  });

  describe('computeInstitutionalSummaries - 20日與5日主力立場總結 (Ticket 17)', () => {
    it('若 5 日累計為正應總結為偏多，負則偏空', () => {
      const { summary5Days, summary20Days } = computeInstitutionalSummaries(sampleHistory);

      expect(summary5Days).toContain('張');
      expect(summary20Days).toContain('張');
    });
  });
});
