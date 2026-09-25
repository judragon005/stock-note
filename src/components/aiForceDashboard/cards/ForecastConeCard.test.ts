import { describe, it, expect } from 'vitest';
import {
  projectForecastNodesToPoints,
  buildForecastCurvePath,
  buildConeAreaPath,
} from './ForecastConeCard';

describe('ForecastConeCard - 預測路徑圖座標與 SVG 路徑計算規範 (Ticket 13)', () => {
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
});
