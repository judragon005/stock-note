import { describe, it, expect } from 'vitest';
import {
  calculateStackedBandSegments,
  formatBiasMetric,
} from './VwapCostStructureCard';

describe('VwapCostStructureCard - 主力成本結構分佈元件規範 (Ticket 15)', () => {
  const sampleBands = [
    { name: '突破區', biasLabel: '>+5%', percentage: 38, color: '#ef4444' },
    { name: '大量成交區', biasLabel: '+2% ~ +5%', percentage: 32, color: '#f59e0b' },
    { name: '主力成本區', biasLabel: '-2% ~ +2%', percentage: 18, color: '#38bdf8' },
    { name: '套牢區', biasLabel: '<-2%', percentage: 12, color: '#10b981' },
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

  it('formatBiasMetric 應為正值加上加號與強勢色彩，負值加上減號', () => {
    const positive = formatBiasMetric(7.5);
    expect(positive.text).toBe('+7.5%');
    expect(positive.isPositive).toBe(true);

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
});
