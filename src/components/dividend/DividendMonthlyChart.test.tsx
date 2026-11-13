import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateMonthTooltipAlign,
  DividendMonthlyChart,
  MonthDividendTooltipContent,
} from './DividendMonthlyChart';
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

    it('Spec 0227 / Ticket 03: 當月份僅有待入帳款項時，應渲染金黃色柱狀與待入帳 Tooltip 資訊', () => {
      const mockDistributionWithPending: MonthlyDividendDistribution[] = [
        { monthKey: '2026-10', monthLabel: '10月', grossTWD: 100000, netTWD: 90000, taxTWD: 10000, count: 2, pendingNetTWD: 0, pendingGrossTWD: 0, pendingCount: 0 },
        { monthKey: '2026-11', monthLabel: '11月', grossTWD: 0, netTWD: 0, taxTWD: 0, count: 0, pendingNetTWD: 16088, pendingGrossTWD: 16098, pendingCount: 1 },
      ];

      const html = renderToStaticMarkup(
        <DividendMonthlyChart
          monthlyDistribution={mockDistributionWithPending}
          maxMonthlyNet={90000}
          targetMonthlyExpenseTwd={60000}
          dividendDisplayMode="NET"
          selectedYear={2026}
        />
      );

      // 11 月長條柱應具備無障礙標籤，揭露實領與待入帳應收
      expect(html).toContain('2026年11月: 實領 NT$ 0, 待入帳應收 NT$ 16,088');
      // 11 月長條柱應渲染金黃色背景漸層
      expect(html).toContain('linear-gradient(180deg, #f59e0b 0%, #d97706 100%)');
      // 11 月文字顏色應為金黃色 (#f59e0b)
      expect(html).toContain('color:#f59e0b');
      // 圖表提示文字應包含金黃色代表待入帳
      expect(html).toContain('金黃色代表待入帳應收股利');
    });

    it('Spec 0227 / Review Fix: MonthDividendTooltipContent 應展開待入帳個別標的清單與預計入帳日', () => {
      const mockDistributionWithPendingItems: MonthlyDividendDistribution = {
        monthKey: '2026-11',
        monthLabel: '11月',
        grossTWD: 0,
        netTWD: 0,
        taxTWD: 0,
        count: 0,
        pendingNetTWD: 16088,
        pendingGrossTWD: 16098,
        pendingCount: 1,
        pendingItems: [
          {
            symbol: '0056',
            name: '元大高股息',
            payDate: '2026-11-11',
            netTWD: 16088,
          },
        ],
      };

      const html = renderToStaticMarkup(
        <MonthDividendTooltipContent
          distribution={mockDistributionWithPendingItems}
          selectedYear={2026}
          dividendDisplayMode="NET"
          targetMonthlyExpenseTwd={60000}
        />
      );

      expect(html).toContain('待入帳標的清單');
      expect(html).toContain('0056');
      expect(html).toContain('(11-11)');
      expect(html).toContain('16,088');
    });
  });
});
