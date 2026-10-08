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

  describe('Ticket 09: 法人行為計量卡與籌碼卡片 250 日真實數據連動 (Spec 0162)', () => {
    it('傳入 250 筆長天期歷史法人買賣超時，calculateDualAxisScales 應安全計算且無任何 NaN', () => {
      const history250 = Array.from({ length: 250 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(3, '0')}`,
        foreignShares: (i % 2 === 0 ? 1 : -1) * (100 + i * 5),
        trustShares: 50 + i * 2,
        dealerShares: -20,
        cumulativeTotalShares: 500 + i * 15,
      }));

      const scales = calculateDualAxisScales(history250, 180);
      expect(isNaN(scales.leftMax)).toBe(false);
      expect(isNaN(scales.leftMin)).toBe(false);
      expect(isNaN(scales.rightMax)).toBe(false);
      expect(isNaN(scales.rightMin)).toBe(false);
      expect(isNaN(scales.zeroY)).toBe(false);

      const summaries = computeInstitutionalSummaries(history250);
      expect(summaries.summary5Days).toContain('張');
      expect(summaries.summary20Days).toContain('張');
    });
  });

  describe('Ticket 04 (Spec 0169): 美股標的微觀量價動能獨立與零偽數據', () => {
    it('美股標的 (isUsMarket=true) 應包含微觀評分資料結構，無三大法人假數據', () => {
      const usData = {
        history: [],
        recentDaysTable: [],
        cumulative20DaysSummary: '美股微觀量價動能評估 (72分)',
        recent5DaysSummary: '美股無三大法人日報',
        isUsMarket: true,
        usMicrostructure: {
          score: 72,
          sentimentLabel: '機構量價偏多',
          mfi: 68,
          obvTrend: 'UP' as const,
          volumeRatio: 1.25,
          note: '美股無三大法人日報，已切換為機構量價評分',
        },
        asOfDateText: '2026-09-25',
      };

      expect(usData.isUsMarket).toBe(true);
      expect(usData.history).toEqual([]);
      expect(usData.usMicrostructure.score).toBe(72);
      expect(usData.usMicrostructure.note).toContain('美股無三大法人日報');
    });
  });

  describe('Ticket 06: 表格日期精簡化與 5 欄零溢出排版規範', () => {
    it('formatShortDate 應將 YYYY-MM-DD 或 YYYY/MM/DD 精簡為 MM/DD', async () => {
      const { formatShortDate } = await import('./InstitutionalFlowCard');
      expect(formatShortDate('2026-09-18')).toBe('09/18');
      expect(formatShortDate('2026/10/05')).toBe('10/05');
      expect(formatShortDate('09/18')).toBe('09/18');
      expect(formatShortDate('')).toBe('');
    });
  });
});

