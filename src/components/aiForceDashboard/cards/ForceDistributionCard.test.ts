import { describe, it, expect } from 'vitest';
import { calculateDonutSegments } from './ForceDistributionCard';
import type { ForceDistributionData } from '../../../types/aiForceDashboard';

describe('ForceDistributionCard & Donut math', () => {
  it('應該精確計算半徑 32 之甜甜圈圓周長與 dasharray 佔比', () => {
    // 2 * PI * 32 = 201.06
    const donut = calculateDonutSegments(65, 35, 32);
    expect(donut.circumference).toBeCloseTo(201.06, 1);
    expect(donut.largeStrokeDasharray).toContain('130.69');
  });

  it('應該相容 ForceDistributionData 資料契約', () => {
    const mockData: ForceDistributionData = {
      largePlayerBuyPercent: 65,
      retailBuyPercent: 35,
      retailSellPressurePercent: 36,
      asOfDateText: '2026-09-18 (法人買進/賣出佔成交量比例，依 20 日平均)',
    };
    expect(mockData.largePlayerBuyPercent).toBe(65);
    expect(mockData.retailBuyPercent).toBe(35);
  });

  describe('Ticket 06: 買賣力圓環 68px 規格統一', () => {
    it('圓環直徑應為 68px，半徑 r=26，文字 14px', async () => {
      const { FORCE_DISTRIBUTION_RING_CONFIG } = await import('./ForceDistributionCard');
      expect(FORCE_DISTRIBUTION_RING_CONFIG.size).toBe(68);
      expect(FORCE_DISTRIBUTION_RING_CONFIG.radius).toBe(26);
      expect(FORCE_DISTRIBUTION_RING_CONFIG.fontSize).toBe(14);
    });
  });

  describe('Spec 0239 T15: Zero-Mock Honest Empty、NaN 防護、colorTheme、美股語意與窄欄防溢位', () => {
    it('calculateDonutSegments 傳入 NaN 不應輸出 NaN 字串', () => {
      const donut = calculateDonutSegments(Number.NaN, Number.POSITIVE_INFINITY, 32);
      expect(donut.largeStrokeDasharray).not.toContain('NaN');
      expect(donut.retailStrokeDasharray).not.toContain('NaN');
    });

    it('無 data 時應顯示 Honest Empty State，不得出現寫死假數值 65% 或 2026-09-18', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ForceDistributionCard } = await import('./ForceDistributionCard');

      const html = renderToStaticMarkup(React.createElement(ForceDistributionCard, {}));
      expect(html).not.toContain('2026-09-18');
      expect(html).not.toContain('65%');
      expect(html).toMatch(/暫無|尚無/);
    });

    it('美股模式應顯示「美股機構動能 vs 散戶追價」且不含「法人 vs 散戶」，並支援 colorTheme 與 flexWrap', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ForceDistributionCard } = await import('./ForceDistributionCard');

      const html = renderToStaticMarkup(
        React.createElement(ForceDistributionCard, {
          market: 'US',
          colorTheme: 'international',
          data: {
            largePlayerBuyPercent: 62,
            retailBuyPercent: 24,
            retailSellPressurePercent: 14,
            asOfDateText: '2026-10-15 (近 20 日美股量價結構)',
            isUsMarket: true,
          },
        })
      );

      expect(html).toContain('美股機構動能 vs 散戶追價');
      expect(html).not.toContain('法人 vs 散戶');
      expect(html).toContain('flex-wrap:wrap');
      // 國際版大戶/機構買盤為綠色 #10b981，賣盤為紅色 #ef4444
      expect(html).toContain('stroke="#10b981"');
      expect(html).toContain('stroke="#ef4444"');
    });
  });
});
