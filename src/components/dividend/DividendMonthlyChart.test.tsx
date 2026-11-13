import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateMonthTooltipAlign, DividendMonthlyChart } from './DividendMonthlyChart';
import { MonthlyDividendDistribution } from '../../types/dividend';

describe('DividendMonthlyChart (月度配息長條圖)', () => {
  describe('calculateMonthTooltipAlign (智慧避讓演算法)', () => {
    it('1~2 月 (索引 0~1) 應靠左展開，避免被卡片左邊界截斷', () => {
      expect(calculateMonthTooltipAlign(0)).toBe('left');
      expect(calculateMonthTooltipAlign(1)).toBe('left');
    });

    it('3~9 月 (索引 2~8) 應居中展開', () => {
      expect(calculateMonthTooltipAlign(2)).toBe('center');
      expect(calculateMonthTooltipAlign(5)).toBe('center');
      expect(calculateMonthTooltipAlign(8)).toBe('center');
    });

    it('10~12 月 (索引 9~11) 應靠右展開向左延伸，避免超出卡片右邊界', () => {
      expect(calculateMonthTooltipAlign(9)).toBe('right');
      expect(calculateMonthTooltipAlign(10)).toBe('right');
      expect(calculateMonthTooltipAlign(11)).toBe('right');
    });
  });

  describe('生活費基準線與幾何長條渲染', () => {
    const mockDistribution: MonthlyDividendDistribution[] = [
      { monthKey: '2026-01', monthLabel: '1月', grossTWD: 30000, netTWD: 28000, taxTWD: 2000, count: 2 },
      { monthKey: '2026-04', monthLabel: '4月', grossTWD: 84863, netTWD: 82959, taxTWD: 1904, count: 3 },
      { monthKey: '2026-10', monthLabel: '10月', grossTWD: 120000, netTWD: 110000, taxTWD: 10000, count: 4 },
    ];

    it('應正確呈現生活費門檻與生活費基準標籤', () => {
      const html = renderToStaticMarkup(
        <DividendMonthlyChart
          monthlyDistribution={mockDistribution}
          maxMonthlyNet={110000}
          targetMonthlyExpenseTwd={60000}
          dividendDisplayMode="NET"
          selectedYear={2026}
        />
      );

      expect(html).toContain('生活費基準: NT$ 60,000');
      expect(html).toContain('🎯 生活費線');
      expect(html).toContain('2026 各月份現金流分佈');
      // 確保生活費線 z-index 為 0
      expect(html).toContain('z-index:0');
      // 確保長條柱 z-index 為 1
      expect(html).toContain('z-index:1');
      // 確保幾何座標精準錨定 (24px 底座 + Math.round((60k / 110k) * 120) = 89px)
      expect(html).toContain('bottom:89px');
    });
  });
});
