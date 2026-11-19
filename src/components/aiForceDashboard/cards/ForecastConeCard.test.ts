import { describe, it, expect } from 'vitest';
import {
  projectForecastNodesToPoints,
  buildForecastCurvePath,
  buildConeAreaPath,
  buildSplitConePaths,
  generateYAxisTicks,
  getMainForceDirectionStyle,
} from './ForecastConeCard';

describe('ForecastConeCard - 預測路徑圖座標與 SVG 路徑計算規範 (Ticket 13 & Spec 0144)', () => {
  const sampleNodes = [
    { dayOffset: 0, label: '今日', upperPrice: 2000, medianPrice: 2000, lowerPrice: 2000 },
    { dayOffset: 3, label: '3日後', upperPrice: 2100, medianPrice: 2050, lowerPrice: 1950 },
    { dayOffset: 5, label: '5日後', upperPrice: 2150, medianPrice: 2070, lowerPrice: 1920 },
    { dayOffset: 10, label: '10日後', upperPrice: 2200, medianPrice: 2100, lowerPrice: 1880 },
  ];

  it('應正確將時間節點轉換為 X, Y 座標陣列，且 X 座標隨時間向右延伸', () => {
    const { upperPoints, medianPoints, lowerPoints } = projectForecastNodesToPoints(
      sampleNodes,
      320,
      180,
      { left: 30, right: 30, top: 20, bottom: 30 }
    );

    expect(upperPoints.length).toBe(4);
    expect(medianPoints.length).toBe(4);
    expect(lowerPoints.length).toBe(4);

    // 第一點 X 座標應在 left padding 處
    expect(upperPoints[0].x).toBe(30);
    // 最後一點 X 座標應在 width - right padding 處
    expect(upperPoints[3].x).toBe(290);

    // 價格越高 Y 越小：最後一點 upperPrice (2200) 的 Y 應小於 lowerPrice (1880) 的 Y
    expect(upperPoints[3].y).toBeLessThan(lowerPoints[3].y);
  });

  it('buildForecastCurvePath 應產生合法的 SVG M... L... 或 C... 路徑字串', () => {
    const points = [
      { x: 30, y: 100 },
      { x: 100, y: 80 },
      { x: 200, y: 60 },
    ];
    const path = buildForecastCurvePath(points);

    expect(path.startsWith('M')).toBe(true);
    expect(path).toContain('30,100');
  });

  it('buildConeAreaPath 應產生閉合的扇形填充區域 (含 Z 結尾)', () => {
    const upperPoints = [
      { x: 30, y: 100 },
      { x: 100, y: 70 },
      { x: 200, y: 50 },
    ];
    const lowerPoints = [
      { x: 30, y: 100 },
      { x: 100, y: 130 },
      { x: 200, y: 150 },
    ];

    const areaPath = buildConeAreaPath(upperPoints, lowerPoints);

    expect(areaPath.startsWith('M')).toBe(true);
    expect(areaPath.endsWith('Z')).toBe(true);
  });

  it('buildSplitConePaths (Spec 0144) 應將發散錐依中軌拆分為上漲面(紅)與下跌面(綠)兩條獨立閉合路徑', () => {
    const upperPoints = [
      { x: 30, y: 100 },
      { x: 100, y: 70 },
      { x: 200, y: 50 },
    ];
    const medianPoints = [
      { x: 30, y: 100 },
      { x: 100, y: 100 },
      { x: 200, y: 95 },
    ];
    const lowerPoints = [
      { x: 30, y: 100 },
      { x: 100, y: 130 },
      { x: 200, y: 150 },
    ];

    const { bullAreaPath, bearAreaPath } = buildSplitConePaths(upperPoints, medianPoints, lowerPoints);

    expect(bullAreaPath.startsWith('M')).toBe(true);
    expect(bullAreaPath.endsWith('Z')).toBe(true);
    expect(bearAreaPath.startsWith('M')).toBe(true);
    expect(bearAreaPath.endsWith('Z')).toBe(true);
  });

  it('generateYAxisTicks (Spec 0144) 應動態生成整數價位刻度標籤與 Y 軸座標', () => {
    const ticks = generateYAxisTicks(1880, 2520, 180, { top: 20, bottom: 25, left: 35, right: 35 });
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    const labels = ticks.map((t) => t.label);
    expect(labels.some((l) => l.includes('2,000') || l.includes('2,500') || l.includes('2000') || l.includes('2500'))).toBe(true);
  });

  it('getMainForceDirectionStyle (Spec 0144) 多頭時應回傳鮮紅色 #ef4444，對齊照片標準', () => {
    const bullStyle = getMainForceDirectionStyle(52, 47, 42);
    expect(bullStyle.color).toBe('#ef4444');
    expect(bullStyle.label).toBe('多頭');

    const bearStyle = getMainForceDirectionStyle(42, 30, 60);
    expect(bearStyle.color).toBe('#10b981');
    expect(bearStyle.label).toBe('空頭');
  });

  describe('Spec 0239 T13: 低價股動態刻度、colorTheme、獨立圖例、useId 與空狀態契約', () => {
    it('低價股 (< $25) 與窄幅小數價位不可因 /50 取整算出 0 飛出畫布，且無浮點長尾誤差', () => {
      const lowPriceTicks = generateYAxisTicks(14.1, 15.9, 180, { top: 20, bottom: 25, left: 44, right: 35 });
      expect(lowPriceTicks.length).toBeGreaterThanOrEqual(2);
      lowPriceTicks.forEach((tick) => {
        expect(tick.price).toBeGreaterThan(14.0);
        expect(tick.price).toBeLessThan(16.0);
        expect(tick.y).toBeGreaterThanOrEqual(20);
        expect(tick.y).toBeLessThanOrEqual(155);
        expect(tick.label).not.toMatch(/000000/);
      });

      const pennyTicks = generateYAxisTicks(0.82, 0.98, 180, { top: 20, bottom: 25, left: 44, right: 35 });
      expect(pennyTicks.length).toBeGreaterThanOrEqual(2);
      pennyTicks.forEach((tick) => {
        expect(tick.price).toBeGreaterThan(0.8);
        expect(tick.price).toBeLessThan(1.0);
        expect(tick.y).toBeGreaterThanOrEqual(20);
        expect(tick.y).toBeLessThanOrEqual(155);
        expect(tick.label).not.toBe('0');
      });
    });

    it('getMainForceDirectionStyle 應響應 colorTheme (international 綠漲紅跌)', () => {
      const usBull = getMainForceDirectionStyle(60, 60, 30, 'international');
      expect(usBull.color).toBe('#10b981');
      expect(usBull.label).toBe('多頭');

      const usBear = getMainForceDirectionStyle(35, 30, 60, 'international');
      expect(usBear.color).toBe('#ef4444');
      expect(usBear.label).toBe('空頭');
    });

    it('timeNodes 為空時應渲染 Honest Empty State，絕不畫 2000~2500 空框', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ForecastConeCard } = await import('./ForecastConeCard');

      const html = renderToStaticMarkup(
        React.createElement(ForecastConeCard, {
          data: {
            bullishProb: 0,
            rangeProb: 0,
            bearishProb: 0,
            mainForceDirectionProb: 0,
            annualizedDriftPercent: 0,
            timeNodes: [],
          },
          colorTheme: 'international',
          market: 'US',
        })
      );

      expect(html).toContain('data-testid="forecast-cone-empty-state"');
      expect(html).not.toContain('2,000');
      expect(html).not.toContain('2,500');
    });

    it('正常渲染時圖例應置於獨立非絕對定位列，漸層 ID 不得寫死 bullConeGrad，且支援美股綠漲紅跌', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ForecastConeCard } = await import('./ForecastConeCard');

      const html = renderToStaticMarkup(
        React.createElement(ForecastConeCard, {
          data: {
            bullishProb: 55,
            rangeProb: 15,
            bearishProb: 30,
            mainForceDirectionProb: 55,
            annualizedDriftPercent: 18.5,
            timeNodes: [
              { dayOffset: 0, label: '今日', upperPrice: 15.0, medianPrice: 15.0, lowerPrice: 15.0 },
              { dayOffset: 5, label: '5日後', upperPrice: 16.2, medianPrice: 15.4, lowerPrice: 14.3 },
              { dayOffset: 10, label: '10日後', upperPrice: 17.0, medianPrice: 15.8, lowerPrice: 13.9 },
            ],
          },
          colorTheme: 'international',
          market: 'US',
        })
      );

      expect(html).toContain('data-testid="forecast-cone-legend"');
      expect(html).not.toContain('id="bullConeGrad"');
      expect(html).not.toContain('紅色：上漲機率');
      expect(html).toContain('上漲機率 55%');
      expect(html).toContain('#10b981');
    });
  });
});
