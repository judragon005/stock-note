import { describe, it, expect } from 'vitest';
import {
  calculateStackedBandSegments,
  formatBiasMetric,
  buildStackedMountainPaths,
  formatLegendItems,
} from './VwapCostStructureCard';

describe('VwapCostStructureCard - 主力成本結構分佈元件規範 (Ticket 15 & Spec 0144)', () => {
  const sampleBands = [
    { name: '倉儲區', biasLabel: '>5%', percentage: 38, color: '#f97316' },
    { name: '套牢區', biasLabel: '-2~-5%', percentage: 32, color: '#10b981' },
    { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#38bdf8' },
    { name: '大量成交區', biasLabel: '±2~5%', percentage: 12, color: '#1e40af' },
  ];

  it('calculateStackedBandSegments 應正確計算各階層之累計起始與結束百分比', () => {
    const segments = calculateStackedBandSegments(sampleBands);

    expect(segments.length).toBe(4);
    // 第一段：0% ~ 38%
    expect(segments[0].startPct).toBe(0);
    expect(segments[0].endPct).toBe(38);

    // 第二段：38% ~ 70%
    expect(segments[1].startPct).toBe(38);
    expect(segments[1].endPct).toBe(70);

    // 第三段：70% ~ 88%
    expect(segments[2].startPct).toBe(70);
    expect(segments[2].endPct).toBe(88);

    // 第四段：88% ~ 100%
    expect(segments[3].startPct).toBe(88);
    expect(segments[3].endPct).toBe(100);
  });

  it('formatBiasMetric 應為正值加上加號與強勢天藍色彩，負值加上減號', () => {
    const positive = formatBiasMetric(7.5);
    expect(positive.text).toBe('+7.5%');
    expect(positive.isPositive).toBe(true);
    expect(positive.color).toBe('#38bdf8');

    const negative = formatBiasMetric(-3.2);
    expect(negative.text).toBe('-3.2%');
    expect(negative.isPositive).toBe(false);

    const zero = formatBiasMetric(0);
    expect(zero.text).toBe('0.0%');
  });

  it('當傳入空陣列時，calculateStackedBandSegments 應安全回傳空陣列', () => {
    const segments = calculateStackedBandSegments([]);
    expect(segments).toEqual([]);
  });

  it('buildStackedMountainPaths (Spec 0144) 應將 4 時點之成本帶數列計算為 4 層平滑閉合面積路徑', () => {
    const sampleTimeNodes = [
      { dateLabel: '06/25', inventoryVol: 15, trappedVol: 15, costVol: 15, heavyVol: 10, totalVolume: 55 },
      { dateLabel: '07/10', inventoryVol: 10, trappedVol: 12, costVol: 10, heavyVol: 8, totalVolume: 40 },
      { dateLabel: '08/10', inventoryVol: 18, trappedVol: 16, costVol: 14, heavyVol: 10, totalVolume: 58 },
      { dateLabel: '08/31', inventoryVol: 8, trappedVol: 10, costVol: 12, heavyVol: 10, totalVolume: 40 },
    ];

    const paths = buildStackedMountainPaths(sampleTimeNodes, 340, 130, { left: 30, right: 10, top: 10, bottom: 25 });

    expect(paths.layer1Path.startsWith('M')).toBe(true);
    expect(paths.layer1Path.endsWith('Z')).toBe(true);
    expect(paths.layer2Path.startsWith('M')).toBe(true);
    expect(paths.layer2Path.endsWith('Z')).toBe(true);
    expect(paths.layer3Path.startsWith('M')).toBe(true);
    expect(paths.layer3Path.endsWith('Z')).toBe(true);
    expect(paths.layer4Path.startsWith('M')).toBe(true);
    expect(paths.layer4Path.endsWith('Z')).toBe(true);
  });

  it('formatLegendItems (Spec 0144) 應對齊照片圖例順序與名稱 (倉儲區/套牢區/主力成本區/大量成交區)', () => {
    const items = formatLegendItems();
    expect(items.length).toBe(4);
    expect(items[0].label).toContain('倉儲區');
    expect(items[1].label).toContain('套牢區');
    expect(items[2].label).toContain('主力成本區');
    expect(items[3].label).toContain('大量成交區');
  });
});


