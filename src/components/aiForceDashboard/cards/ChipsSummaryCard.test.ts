import { describe, it, expect } from 'vitest';
import { normalizeSparklinePoints } from './ChipsSummaryCard';
import type { ChipsSummaryData } from '../../../types/aiForceDashboard';

describe('ChipsSummaryCard & Sparkline normalization', () => {
  it('應該正確將數列歸一化為 SVG 折線 Path', () => {
    const points = [10, 20, 15, 30];
    const { pathD, isUp } = normalizeSparklinePoints(points, 90, 30);
    expect(pathD).toMatch(/^M 0,/);
    expect(pathD).toContain('L 90,');
    expect(isUp).toBe(true);
  });

  it('應該在單一數值或空數列時安全回退', () => {
    expect(normalizeSparklinePoints([], 80, 30).pathD).toBe('');
    expect(normalizeSparklinePoints([100], 80, 30).pathD).toBe('M 0 15 L 80 15');
  });

  it('應該正確判定走勢下墜 (isUp = false)', () => {
    const points = [100, 80, 60, 40];
    const { isUp } = normalizeSparklinePoints(points, 80, 30);
    expect(isUp).toBe(false);
  });

  it('應該相容 ChipsSummaryData 資料模型契約', () => {
    const mockData: ChipsSummaryData = {
      foreignNetShares: -166,
      trustNetShares: 89,
      dealerNetShares: 82,
      threeInstitutionsTotal: 5,
      verdictNote: '2026-09-18 短線偏空 | 追價風險可控',
      conclusionBadge: '偏空震盪',
      sparklineHistory: [100, 250, 180, 420, 310, 520, 480, 620, 590, 600],
    };
    expect(mockData.foreignNetShares).toBe(-166);
    expect(mockData.threeInstitutionsTotal).toBe(5);
  });

  it('Ticket 04: 美股標的 (isUsMarket=true) 應包含美股機構評分與 USD 標記，外資為 0 張', () => {
    const usChipsData: ChipsSummaryData = {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      threeInstitutionsTotal: 0,
      verdictNote: '2026-09-25 美股微觀動能評估 (72分) | 已切換為機構量價評分',
      conclusionBadge: '機構量價偏多',
      sparklineHistory: [],
      isUsMarket: true,
      usMicroNote: '美股無三大法人日報，已切換為機構量價評分',
      asOfDateText: '2026-09-25',
    };

    expect(usChipsData.isUsMarket).toBe(true);
    expect(usChipsData.foreignNetShares).toBe(0);
    expect(usChipsData.trustNetShares).toBe(0);
    expect(usChipsData.dealerNetShares).toBe(0);
    expect(usChipsData.usMicroNote).toContain('美股無三大法人日報');
  });
});
