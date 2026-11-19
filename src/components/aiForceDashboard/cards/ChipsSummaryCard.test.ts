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

  describe('Spec 0239 T15: 投信連買、基準日、空 Sparkline、zeroY 基準、colorTheme 與美股去重', () => {
    it('normalizeSparklinePoints 含負值時 areaD 應以 zeroY 封閉而非寫死封閉至最底 height', () => {
      const { areaD, zeroY } = normalizeSparklinePoints([-100, 50, -40, 120], 160, 50);
      expect(zeroY).toBeDefined();
      expect(areaD).toContain(`L 160,${zeroY} L 0,${zeroY} Z`);
    });

    it('台股模式應渲染 trustConsecutiveDays、asOfDateText，空 Sparkline 顯示友善文字，且結論標籤響應 colorTheme', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ChipsSummaryCard } = await import('./ChipsSummaryCard');

      const htmlIntl = renderToStaticMarkup(
        React.createElement(ChipsSummaryCard, {
          colorTheme: 'international',
          data: {
            foreignNetShares: 520,
            trustNetShares: 180,
            dealerNetShares: 40,
            threeInstitutionsTotal: 740,
            verdictNote: '法人同步偏多買進',
            conclusionBadge: '土洋合買偏多',
            sparklineHistory: [],
            trustConsecutiveDays: 4,
            asOfDateText: '2026-10-15',
          },
        })
      );

      expect(htmlIntl).toContain('投信連買');
      expect(htmlIntl).toContain('4 日');
      expect(htmlIntl).toContain('2026-10-15');
      expect(htmlIntl).toContain('暫無');
      // 國際版偏多應為綠色 #10b981 而非寫死紅色 #f87171
      expect(htmlIntl).toContain('color:#10b981;font-weight:800');
    });

    it('台股模式應相容別名欄位 (foreignInvestorsNetBuyShares 等)', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ChipsSummaryCard } = await import('./ChipsSummaryCard');

      const aliasData = {
        foreignInvestorsNetBuyShares: 310,
        investmentTrustNetBuyShares: -45,
        dealerNetBuyShares: 20,
        verdictNote: '別名資料測試',
        conclusionBadge: '外資買超',
        sparklineHistory: [10, 30, 50],
      } as unknown as ChipsSummaryData;

      const html = renderToStaticMarkup(React.createElement(ChipsSummaryCard, { data: aliasData }));
      expect(html).toContain('+310 張');
      expect(html).toContain('-45 張');
      expect(html).toContain('+20 張');
      expect(html).toContain('+285 張');
    });

    it('美股模式不應重複渲染兩次 conclusionLabel，且應響應 colorTheme 與掛載 RVOL 詞條提示', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ChipsSummaryCard } = await import('./ChipsSummaryCard');

      const usData: ChipsSummaryData = {
        foreignNetShares: 0,
        trustNetShares: 0,
        dealerNetShares: 0,
        threeInstitutionsTotal: 0,
        verdictNote: '美股動能追蹤',
        conclusionBadge: '機構量價增溫',
        sparklineHistory: [10, 25, 40],
        isUsMarket: true,
        asOfDateText: '2026-10-15',
        usMicroMetrics: {
          rvol: 1.65,
          vwapBiasPct: 1.85,
          mfiScore: 72,
          atrValue: 3.2,
          conclusionLabel: '專屬唯一結論標記',
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(ChipsSummaryCard, {
          data: usData,
          market: 'US',
          colorTheme: 'international',
        })
      );

      const occurrences = html.split('專屬唯一結論標記').length - 1;
      expect(occurrences).toBe(1);
      // 國際版偏多 (vwapBiasPct > 0, rvol >= 1.2) 應為綠 #10b981
      expect(html).toContain('color:#10b981');
      // RVOL 應掛載 TermTooltip (帶 cursor:help / term-tooltip)
      expect(html).toMatch(/cursor:help[^>]*>RVOL 相對均量|RVOL 相對均量/);
      expect(html).toContain('data-term-id="rvol"');
    });
  });
});


