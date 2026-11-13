import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DividendTopContributorsCard } from './DividendTopContributorsCard';
import { DividendContributor } from './DividendHistoryTable';
import { HoldingPosition } from '../../types/stock';

describe('DividendTopContributorsCard (股息貢獻排行卡片)', () => {
  const mockContributors: DividendContributor[] = [
    { symbol: '00919', name: '群益台灣精選高息', market: 'TW', totalDividendsTWD: 294748, percentageOfTotal: 48.4 },
    { symbol: '00878', name: '國泰永續高股息', market: 'TW', totalDividendsTWD: 81835, percentageOfTotal: 13.4 },
    { symbol: '9927', name: '泰銘', market: 'TW', totalDividendsTWD: 48945, percentageOfTotal: 8.0 },
  ];

  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '00919',
      name: '群益台灣精選高息',
      market: 'TW',
      shares: 10000,
      avgCost: 21.5,
      totalCost: 215000,
      currentPrice: 24.2,
      currentValue: 242000,
      unrealizedPnl: 27000,
      unrealizedPnlPercent: 12.5,
      yieldOnCostPercent: 45.9,
    } as any,
  ];

  it('應正確呈現標的排行、金額與占比進度條', () => {
    const html = renderToStaticMarkup(
      <DividendTopContributorsCard
        activeContributors={mockContributors}
        rankMode="YEAR"
        onRankModeChange={vi.fn()}
        selectedYear={2026}
        holdings={mockHoldings}
      />
    );

    expect(html).toContain('股息貢獻排行 (Top)');
    expect(html).toContain('00919');
    expect(html).toContain('群益台灣精選高息');
    expect(html).toContain('NT$ 294,748 (48.4%)');
    expect(html).toContain('YOC: 45.9%');
    expect(html).toContain('2026年');
    expect(html).toContain('全歷史');
  });

  it('無資料時應呈現友善空狀態提示', () => {
    const html = renderToStaticMarkup(
      <DividendTopContributorsCard
        activeContributors={[]}
        rankMode="YEAR"
        onRankModeChange={vi.fn()}
        selectedYear={2026}
        holdings={[]}
      />
    );

    expect(html).toContain('2026 年度尚無股息記錄');
  });
});

