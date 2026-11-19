import { describe, it, expect } from 'vitest';
import { calculateCircleProgress, calculateOverallHealthScore, DONUT_GAUGE_CONFIG } from './HealthSummaryCard';
import type { HealthSummaryData } from '../../../types/aiForceDashboard';

describe('HealthSummaryCard - 甜甜圈進度環飽滿放大規範 (Ticket 04)', () => {
  it('甜甜圈尺寸應擴大至 76px 以上，半徑 30px 以上，筆觸 6px 以上，且數值放大至 15px', () => {
    expect(DONUT_GAUGE_CONFIG.size).toBeGreaterThanOrEqual(76);
    expect(DONUT_GAUGE_CONFIG.radius).toBeGreaterThanOrEqual(30);
    expect(DONUT_GAUGE_CONFIG.strokeWidth).toBeGreaterThanOrEqual(6);
    expect(DONUT_GAUGE_CONFIG.percentFontSize).toBe('15px');
  });
});

describe('HealthSummaryCard & calculateCircleProgress', () => {
  it('應該精確計算半徑 22 之圓周率與 strokeDashoffset', () => {
    // 2 * PI * 22 = 138.23
    const progress50 = calculateCircleProgress(50, 22);
    expect(progress50.circumference).toBeCloseTo(138.23, 1);
    expect(progress50.strokeDashoffset).toBeCloseTo(69.115, 1);
    expect(progress50.clamped).toBe(50);
  });

  it('應該在百分比為 100% 時 dashOffset 為 0', () => {
    const progress100 = calculateCircleProgress(100, 22);
    expect(progress100.strokeDashoffset).toBe(0);
    expect(progress100.clamped).toBe(100);
  });

  it('應該在百分比為 0% 或負數時正確截斷並 dashOffset 等於圓周長', () => {
    const progress0 = calculateCircleProgress(0, 22);
    expect(progress0.strokeDashoffset).toBe(progress0.circumference);

    const progressNeg = calculateCircleProgress(-20, 22);
    expect(progressNeg.clamped).toBe(0);
    expect(progressNeg.strokeDashoffset).toBe(progressNeg.circumference);
  });

  it('應該在百分比超過 100% 時截斷至 100%', () => {
    const progressOver = calculateCircleProgress(150, 22);
    expect(progressOver.clamped).toBe(100);
    expect(progressOver.strokeDashoffset).toBe(0);
  });

  it('應該正確計算 5 項指標平均綜合評分（流動性風險反轉為正向安全度 100 - liquidityRisk）', () => {
    const score = calculateOverallHealthScore({
      chipHealth: 55,
      technicalStructure: 80,
      capitalMomentum: 58,
      liquidityRisk: 5,
      institutionalSupport: 50,
    });
    // 平均值 (55 + 80 + 58 + (100 - 5) + 50) / 5 = 338 / 5 = 67.6 ≈ 68 分
    expect(score.averageScore).toBe(68);
    expect(score.ratingLabel).toContain('良好');
  });

  it('應該正確解析 HealthSummaryData 契約', () => {
    const mockData: HealthSummaryData = {
      chipHealth: 55,
      technicalStructure: 80,
      capitalMomentum: 58,
      liquidityRisk: 5,
      institutionalSupport: 50,
      overallRatingLabel: '普通 (平均 50 分)',
    };
    expect(mockData.overallRatingLabel).toBe('普通 (平均 50 分)');
  });

  describe('Spec 0239 T15: 流動性風險語意對齊、NaN 防護、flexWrap 與美股術語', () => {
    it('calculateCircleProgress 傳入 NaN / Infinity 應安全回退至 0 不產出 NaN', () => {
      const resNaN = calculateCircleProgress(Number.NaN, 30);
      expect(Number.isFinite(resNaN.clamped)).toBe(true);
      expect(resNaN.clamped).toBe(0);
      expect(Number.isFinite(resNaN.strokeDashoffset)).toBe(true);

      const resInf = calculateCircleProgress(Number.POSITIVE_INFINITY, 30);
      expect(resInf.clamped).toBe(0);
      expect(Number.isFinite(resInf.strokeDashoffset)).toBe(true);
    });

    it('第 4 環應標註「流動性風險」與「越低越佳」反向提示，不再誤標「波動風險度」，且外層支援 flexWrap', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { HealthSummaryCard } = await import('./HealthSummaryCard');

      const html = renderToStaticMarkup(
        React.createElement(HealthSummaryCard, {
          data: {
            chipHealth: 65,
            technicalStructure: 78,
            capitalMomentum: 62,
            liquidityRisk: 18,
            institutionalSupport: 70,
            overallRatingLabel: '良好 (平均 71 分)',
          },
        })
      );

      expect(html).toContain('流動性風險');
      expect(html).toContain('越低越佳');
      expect(html).not.toContain('波動風險度');
      expect(html).toContain('flex-wrap:wrap');
    });

    it('美股模式 (market="US") 第 1/5 環應改稱「籌碼結構」與「機構支撐」', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { HealthSummaryCard } = await import('./HealthSummaryCard');

      const html = renderToStaticMarkup(
        React.createElement(HealthSummaryCard, {
          market: 'US',
          colorTheme: 'international',
          data: {
            chipHealth: 72,
            technicalStructure: 80,
            capitalMomentum: 68,
            liquidityRisk: 12,
            institutionalSupport: 75,
            overallRatingLabel: '優良 (平均 77 分)',
          },
        })
      );

      expect(html).toContain('籌碼結構');
      expect(html).toContain('機構支撐');
      expect(html).not.toContain('法人支撐度');
    });
  });
});
