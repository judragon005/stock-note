import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DividendCalendarCard } from './DividendCalendarCard';
import { DividendTaxDeductionStats } from '../../engine/taxOptimizationGuard';

describe('DividendCalendarCard (未來 12 個月現金流月曆與活水轉向卡片)', () => {
  const mockProjectedCashflow = {
    months: [
      { yearMonth: '2026-01', monthNumber: 1, estimatedTotalTwd: 40000, isDrySeason: false, breakdown: [] },
      { yearMonth: '2026-02', monthNumber: 2, estimatedTotalTwd: 10000, isDrySeason: true, breakdown: [] },
      { yearMonth: '2026-03', monthNumber: 3, estimatedTotalTwd: 50000, isDrySeason: false, breakdown: [] },
    ],
    annualTotalTwd: 360000,
    monthlyAverageTwd: 30000,
    drySeasonMonths: ['02'],
  };

  const mockTaxStats: DividendTaxDeductionStats = {
    totalDividendTwd: 360000,
    deductionRate: 0.085,
    maxCapTwd: 80000,
    estimatedDeductionAmountTwd: 30600,
    remainingDeductionCapacityTwd: 49400,
    isCapReached: false,
    effectiveThresholdTwd: 941176,
  };

  it('應正確呈現全年預估與生活費覆蓋率', () => {
    const html = renderToStaticMarkup(
      <DividendCalendarCard
        projectedCashflow={mockProjectedCashflow as any}
        complementaryRecommendations={[]}
        taxStats={mockTaxStats}
        targetMonthlyExpenseTwd={35000}
        isCashflowExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );
    expect(html).toContain('NT$ 360,000');
    expect(html).toContain('NT$ 30,000');
    // 30000 / 35000 = 85.7%
    expect(html).toContain('85.7%');
    expect(html).toContain('枯水期');
  });

  it('若傳入 Zavy 活水轉向指引，應展示活水轉向公債/黃金指引區塊', () => {
    const html = renderToStaticMarkup(
      <DividendCalendarCard
        projectedCashflow={mockProjectedCashflow as any}
        complementaryRecommendations={[]}
        taxStats={mockTaxStats}
        zavyDividendPlanSummary="建議活水注入 00687B (純公債) 與 00635U (黃金)"
        isCashflowExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );
    expect(html).toContain('Zavy 股息活水轉向');
    expect(html).toContain('00687B');
  });
});
