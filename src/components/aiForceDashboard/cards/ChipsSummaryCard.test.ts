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

  it('6. Ticket 02A: normalizeSparklinePoints 應計算 0 軸基準線座標 zeroY', () => {
    // 當有正有負時，0 軸應該介於 0 與 height 之間
    const points = [-100, 200];
    const { zeroY } = normalizeSparklinePoints(points, 160, 50);
    expect(zeroY).toBeDefined();
    expect(zeroY).toBeGreaterThan(0);
    expect(zeroY).toBeLessThan(50);
  });

  it('7. Ticket 02A: ChipsSummaryCard 應採用 1fr 1fr 等寬 50%:50% 網格佈局', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ChipsSummaryCard } = await import('./ChipsSummaryCard');

    const mockData: ChipsSummaryData = {
      foreignNetShares: -166,
      trustNetShares: 89,
      dealerNetShares: 82,
      threeInstitutionsTotal: 5,
      verdictNote: '2026-09-18 短線偏多',
      conclusionBadge: '投信連 3 買',
      sparklineHistory: [-100, 50, 120, -30, 200],
    };

    const html = renderToStaticMarkup(React.createElement(ChipsSummaryCard, { data: mockData }));
    expect(html).toContain('grid-template-columns:1fr 1fr');
    expect(html).toContain('data-testid="chips-zero-axis"');
    expect(html).toContain('投信連 3 買');
  });

  it('8. Ticket 02B: 美股模式具備 usMicroMetrics 時應對稱渲染 50%:50% 佈局，包含 RVOL, VWAP, MFI, ATR', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ChipsSummaryCard } = await import('./ChipsSummaryCard');

    const usData: ChipsSummaryData = {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      threeInstitutionsTotal: 0,
      verdictNote: '美股機構微觀動態評估',
      conclusionBadge: '機構量價增溫',
      sparklineHistory: [40, 52, 48, 65, 72, 80],
      isUsMarket: true,
      asOfDateText: '2026-09-25',
      usMicroMetrics: {
        rvol: 1.45,
        vwapBiasPct: 2.3,
        mfiScore: 68,
        atrValue: 4.85,
        conclusionLabel: '機構量價增溫',
      },
    };

    const html = renderToStaticMarkup(React.createElement(ChipsSummaryCard, { data: usData }));

    expect(html).toContain('grid-template-columns:1fr 1fr');
    expect(html).toContain('RVOL 相對均量');
    expect(html).toContain('1.45x');
    expect(html).toContain('VWAP 偏離');
    expect(html).toContain('+2.30%');
    expect(html).toContain('MFI 機構量能');
    expect(html).toContain('ATR 日振幅');
    expect(html).toContain('機構量價增溫');
  });
});


